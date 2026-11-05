/** Textos pt-BR da administração de categorias (spec `category-admin`). */
export const CATEGORY_TEXT = {
  created: "Categoria criada.",
  renamed: "Categoria renomeada.",
  deactivated: "Categoria desativada.",
  activated: "Categoria ativada.",
  duplicateName: "Já existe uma categoria com esse nome.",
  gone: "Esta categoria não foi encontrada. A lista foi atualizada.",
  inactiveExplanation:
    "Categorias inativas não aparecem para quem abre chamados. Os chamados que já usam a categoria continuam com ela.",
  empty:
    "Nenhuma categoria cadastrada ainda. Crie a primeira para que os clientes possam abrir chamados.",
  loadError: "Não foi possível carregar as categorias.",
} as const;

/** Rótulos dos botões e diálogos. */
export const CATEGORY_COPY = {
  pageTitle: "Categorias",
  newCategory: "Nova categoria",
  rename: "Renomear",
  deactivate: "Desativar",
  activate: "Ativar",
  deactivating: "Desativando...",
  activating: "Ativando...",
  active: "Ativa",
  inactive: "Inativa",
  nameLabel: "Nome",
  cancel: "Cancelar",
  listLabel: "Lista de categorias",
  dialog: {
    create: {
      title: "Nova categoria",
      submit: "Criar",
      pending: "Criando...",
      announce: "Criando categoria...",
    },
    rename: {
      title: "Renomear categoria",
      submit: "Salvar",
      pending: "Salvando...",
      announce: "Salvando categoria...",
    },
  },
} as const;
