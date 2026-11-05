/** Textos pt-BR da administração de usuários. */
export const USER_TEXT = {
  pageTitle: "Usuários",
  newUser: "Novo usuário",
  loadError: "Não foi possível carregar os usuários.",
  outOfRange: "Esta página não tem usuários.",
  firstPage: "Ir para a primeira página",
  self: "Você",
  changeRole: "Mudar papel",
  changingRole: "Alterando...",
  roleChanged: "Papel alterado.",
  gone: "Este usuário não foi encontrado. A lista foi atualizada.",
  cancel: "Cancelar",
  newRoleLabel: "Novo papel",
  newRolePlaceholder: "Selecione o novo papel",
  createSubmit: "Cadastrar usuário",
  createPending: "Cadastrando...",
  createAnnounce: "Cadastrando usuário...",
  publicSignup:
    "Cadastre aqui atendentes e administradores. Clientes criam a própria conta pelo cadastro público.",
  passwordHelp: "Entre 8 e 128 caracteres.",
} as const;

export function changeRoleTitle(name: string) {
  return `Mudar papel de ${name}`;
}

export function demotionWarning(name: string) {
  return `Chamados atribuídos a ${name} continuam atribuídos a essa pessoa. Reatribua-os pelo detalhe do chamado.`;
}
