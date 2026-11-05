import { describe, expect, it } from "vitest";
import { AUTH_MESSAGES, loginSchema, signupSchema } from "@/lib/validation/auth";
import { readFormFields, toFieldErrors } from "@/lib/validation/form";

function loginErrors(input: { email: string; password: string }) {
  const result = loginSchema.safeParse(input);
  return result.success ? {} : toFieldErrors(result.error);
}

const validSignup = {
  name: "Ana",
  email: "ana@teste.com",
  password: "senhaSegura123",
  confirmPassword: "senhaSegura123",
};

function signupErrors(input: Partial<typeof validSignup>) {
  const result = signupSchema.safeParse({ ...validSignup, ...input });
  return result.success ? {} : toFieldErrors(result.error);
}

describe("loginSchema", () => {
  it("aceita credenciais válidas e remove espaços do e-mail", () => {
    expect(loginSchema.parse({ email: " ana@teste.com ", password: "x" })).toEqual({
      email: "ana@teste.com",
      password: "x",
    });
  });

  it("campos vazios", () => {
    expect(loginErrors({ email: "", password: "" })).toEqual({
      email: "Informe seu e-mail.",
      password: "Informe sua senha.",
    });
  });

  it("e-mail com formato inválido", () => {
    expect(loginErrors({ email: "ana@", password: "x" })).toEqual({
      email: "Informe um e-mail válido.",
    });
  });

  it("senha acima de 128 caracteres", () => {
    expect(loginErrors({ email: "ana@teste.com", password: "a".repeat(129) })).toEqual({
      password: "A senha deve ter no máximo 128 caracteres.",
    });
  });
});

describe("signupSchema", () => {
  it("normaliza o e-mail (trim + minúsculas) e o nome (trim)", () => {
    const data = signupSchema.parse({ ...validSignup, name: "  Ana  ", email: "  Ana@Teste.COM " });
    expect(data.email).toBe("ana@teste.com");
    expect(data.name).toBe("Ana");
  });

  it("nome curto demais", () => {
    expect(signupErrors({ name: "A" })).toEqual({
      name: "O nome deve ter entre 2 e 100 caracteres.",
    });
  });

  it("nome com espaços que viram 1 caractere", () => {
    expect(signupErrors({ name: "  A  " }).name).toBe(AUTH_MESSAGES.nameLength);
  });

  it("nome acima de 100 caracteres", () => {
    expect(signupErrors({ name: "a".repeat(101) }).name).toBe(AUTH_MESSAGES.nameLength);
  });

  it("e-mail inválido", () => {
    expect(signupErrors({ email: "ana.teste.com" })).toEqual({
      email: "Informe um e-mail válido.",
    });
  });

  it("e-mail acima de 200 caracteres", () => {
    expect(signupErrors({ email: `${"a".repeat(195)}@b.com` }).email).toBe(
      AUTH_MESSAGES.emailTooLong,
    );
  });

  it("senha curta demais", () => {
    expect(signupErrors({ password: "1234567", confirmPassword: "1234567" })).toEqual({
      password: "A senha deve ter entre 8 e 128 caracteres.",
    });
  });

  it("senha acima de 128", () => {
    const long = "a".repeat(129);
    expect(signupErrors({ password: long, confirmPassword: long }).password).toBe(
      AUTH_MESSAGES.passwordLength,
    );
  });

  it("confirmação diferente", () => {
    expect(signupErrors({ confirmPassword: "outraSenha123" })).toEqual({
      confirmPassword: "As senhas não conferem.",
    });
  });

  it("campos vazios", () => {
    expect(signupErrors({ name: "", email: "", password: "", confirmPassword: "" })).toEqual({
      name: "Informe seu nome.",
      email: "Informe seu e-mail.",
      password: "Crie uma senha.",
      confirmPassword: "Confirme sua senha.",
    });
  });
});

describe("helpers de formulário", () => {
  it("readFormFields lê strings e usa '' para ausentes", () => {
    const fd = new FormData();
    fd.set("email", "a@b.co");
    expect(readFormFields(fd, ["email", "password"])).toEqual({ email: "a@b.co", password: "" });
  });

  it("toFieldErrors pega a primeira mensagem de cada campo", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(toFieldErrors(result.error))).toEqual(["email", "password"]);
    }
  });
});
