import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { proxy } from "@/proxy";
import { jwtExpiringIn } from "./helpers";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));
vi.mock("@/lib/auth/refresh", () => ({ refreshSingleFlight: refreshMock }));

beforeEach(() => {
  refreshMock.mockReset();
});

function request(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return new NextRequest(new URL(path, "http://localhost:3100"), {
    headers: cookie ? { cookie } : {},
  });
}

function location(response: Response) {
  const value = response.headers.get("location");
  if (!value) return null;
  const url = new URL(value);
  return `${url.pathname}${url.search}`;
}

/** Cookie header que a renderização vai receber (requisição encaminhada). */
function forwardedCookies(response: Response) {
  return response.headers.get("x-middleware-request-cookie") ?? "";
}

const fresh = () => jwtExpiringIn(900);
const expiring = () => jwtExpiringIn(30);
const expired = () => jwtExpiringIn(-10);

describe("proxy: redirecionamentos", () => {
  it("visitante em rota protegida → /login?next=", async () => {
    const res = await proxy(request("/dashboard?x=1"));
    expect(location(res)).toBe("/login?next=%2Fdashboard%3Fx%3D1");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("visitante em subrota protegida → /login?next= com a query", async () => {
    const res = await proxy(request("/chamados?status=OPEN"));
    expect(location(res)).toBe("/login?next=%2Fchamados%3Fstatus%3DOPEN");
  });

  it.each(["/categorias", "/usuarios", "/chamados/novo"])(
    "visitante em %s → login",
    async (path) => {
      const res = await proxy(request(path));
      expect(location(res)).toBe(`/login?next=${encodeURIComponent(path)}`);
    },
  );

  it("raiz sem sessão → /login; com sessão → /dashboard", async () => {
    expect(location(await proxy(request("/")))).toBe("/login");
    expect(location(await proxy(request("/", { td_access: fresh(), td_refresh: "r" })))).toBe(
      "/dashboard",
    );
  });

  it("logado em /login ou /cadastro → /dashboard", async () => {
    for (const path of ["/login", "/cadastro"]) {
      const res = await proxy(request(path, { td_access: fresh(), td_refresh: "r" }));
      expect(location(res)).toBe("/dashboard");
    }
  });

  it("visitante em /login segue normalmente", async () => {
    const res = await proxy(request("/login"));
    expect(location(res)).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("sessão válida em /dashboard segue sem renovar", async () => {
    const res = await proxy(request("/dashboard", { td_access: fresh(), td_refresh: "r" }));
    expect(location(res)).toBeNull();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

describe("proxy: refresh preventivo", () => {
  it.each([
    ["access perto de expirar", { td_access: expiring(), td_refresh: "r1" }],
    ["access ausente", { td_refresh: "r1" }],
    ["access expirado", { td_access: expired(), td_refresh: "r1" }],
  ])("%s → renova e encaminha os cookies novos", async (_, cookies) => {
    const tokens = { accessToken: fresh(), refreshToken: "r2" };
    refreshMock.mockResolvedValue(tokens);

    const res = await proxy(request("/dashboard", cookies));

    expect(refreshMock).toHaveBeenCalledWith("r1");
    expect(location(res)).toBeNull();
    expect(res.cookies.get("td_access")?.value).toBe(tokens.accessToken);
    expect(res.cookies.get("td_access")?.httpOnly).toBe(true);
    expect(res.cookies.get("td_refresh")?.value).toBe("r2");
    expect(res.cookies.get("td_refresh")?.maxAge).toBe(7 * 24 * 60 * 60);
    expect(forwardedCookies(res)).toContain(`td_access=${tokens.accessToken}`);
    expect(forwardedCookies(res)).toContain("td_refresh=r2");
  });

  it("não renova sem refresh token", async () => {
    const res = await proxy(request("/dashboard", { td_access: expiring() }));
    expect(refreshMock).not.toHaveBeenCalled();
    // ainda utilizável por 30 s
    expect(location(res)).toBeNull();
  });

  it("refresh 401 → apaga cookies e vai ao login com aviso", async () => {
    refreshMock.mockImplementation(async () => {
      throw new ApiError(401);
    });
    const res = await proxy(request("/dashboard", { td_access: expired(), td_refresh: "r1" }));

    expect(location(res)).toBe("/login?next=%2Fdashboard&aviso=sessao-expirada");
    expect(res.cookies.get("td_access")?.maxAge).toBe(0);
    expect(res.cookies.get("td_refresh")?.maxAge).toBe(0);
  });

  it("refresh 401 em /login → apaga cookies e mostra o login", async () => {
    refreshMock.mockImplementation(async () => {
      throw new ApiError(401);
    });
    const res = await proxy(request("/login", { td_refresh: "r1" }));
    expect(location(res)).toBeNull();
    expect(res.cookies.get("td_refresh")?.value).toBe("");
    expect(forwardedCookies(res)).not.toContain("td_refresh");
  });

  it("falha de rede no refresh com access ainda válido → segue", async () => {
    refreshMock.mockImplementation(async () => {
      throw new ApiError(NETWORK_ERROR_STATUS);
    });
    const res = await proxy(request("/dashboard", { td_access: expiring(), td_refresh: "r1" }));
    expect(location(res)).toBeNull();
    expect(res.cookies.get("td_access")).toBeUndefined();
  });

  it("falha de rede no refresh sem access → login sem aviso e sem apagar cookies", async () => {
    refreshMock.mockImplementation(async () => {
      throw new ApiError(NETWORK_ERROR_STATUS);
    });
    const res = await proxy(request("/dashboard", { td_refresh: "r1" }));
    expect(location(res)).toBe("/login?next=%2Fdashboard");
    expect(res.cookies.get("td_refresh")).toBeUndefined();
  });
});

describe("proxy: sessão recusada pelo DAL", () => {
  it("/login?aviso=sessao-expirada apaga cookies locais sem chamar a API", async () => {
    const res = await proxy(
      request("/login?aviso=sessao-expirada", { td_access: fresh(), td_refresh: "r1" }),
    );
    expect(location(res)).toBeNull();
    expect(refreshMock).not.toHaveBeenCalled();
    expect(res.cookies.get("td_access")?.maxAge).toBe(0);
    expect(res.cookies.get("td_refresh")?.maxAge).toBe(0);
  });
});
