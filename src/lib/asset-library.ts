export type AssetLibraryItem = {
  id: string;
  label: string;
  category: string;
  source: string;
  license: string;
  url: string;
};

export type AssetLibraryCategory = {
  id: string;
  label: string;
  description: string;
  items: AssetLibraryItem[];
};

export const ASSET_LIBRARY: AssetLibraryCategory[] = [
  {
    id: "living-room",
    label: "Sala",
    description: "Objetos para ambientes internos de estar e entretenimento.",
    items: [
      {
        id: "couch",
        label: "Sofa",
        category: "Sala",
        source: "Poly Pizza",
        license: "CC BY",
        url: "https://poly.pizza/m/5v5e10T-2zv",
      },
      {
        id: "sofa-alt",
        label: "Sofa alternativo",
        category: "Sala",
        source: "Poly Pizza",
        license: "CC BY",
        url: "https://poly.pizza/m/5ngh9YauT9G",
      },
      {
        id: "tv",
        label: "Televisao",
        category: "Sala",
        source: "Poly Pizza",
        license: "CC BY",
        url: "https://poly.pizza/m/7-dgp0L8elg",
      },
      {
        id: "table-chairs",
        label: "Mesa com cadeiras",
        category: "Sala",
        source: "Poly Pizza",
        license: "CC BY",
        url: "https://poly.pizza/m/8YCrudS_CF9",
      },
    ],
  },
  {
    id: "outdoor",
    label: "Externo",
    description: "Vegetacao e composicao de areas abertas e jardim.",
    items: [
      {
        id: "tree-sample",
        label: "Arvore baixa",
        category: "Externo",
        source: "Poly Pizza",
        license: "CC BY",
        url: "https://poly.pizza/m/SohHeimkcz",
      },
      {
        id: "trees-pack",
        label: "Conjunto de arvores",
        category: "Externo",
        source: "Poly Pizza",
        license: "CC BY",
        url: "https://poly.pizza/m/IhgVEY2OQ9",
      },
      {
        id: "tree-cc0",
        label: "Arvore CC0",
        category: "Externo",
        source: "Poly Pizza",
        license: "CC0",
        url: "https://poly.pizza/m/Ufuhx2aA2Y",
      },
      {
        id: "nature-catalog",
        label: "Catalogo de natureza",
        category: "Externo",
        source: "Poly Pizza",
        license: "Misto",
        url: "https://poly.pizza/explore/Nature",
      },
    ],
  },
  {
    id: "transport",
    label: "Mobilidade",
    description: "Carros e elementos de acesso para compor garagem e area externa.",
    items: [
      {
        id: "blue-car",
        label: "Carro compacto",
        category: "Mobilidade",
        source: "Poly Pizza",
        license: "CC0",
        url: "https://poly.pizza/m/548lb3MmT3",
      },
      {
        id: "car-kit",
        label: "Car Kit bundle",
        category: "Mobilidade",
        source: "Kenney",
        license: "Kenney License",
        url: "https://www.kenney.nl/assets/car-kit",
      },
      {
        id: "learning-cars",
        label: "Colecao de carros",
        category: "Mobilidade",
        source: "Poly Pizza",
        license: "CC BY",
        url: "https://poly.pizza/m/4Z1_Me2ww83",
      },
    ],
  },
  {
    id: "bundles",
    label: "Bibliotecas",
    description: "Pacotes inteiros para acelerar expansao futura da biblioteca.",
    items: [
      {
        id: "furniture-kit",
        label: "Furniture Kit",
        category: "Bibliotecas",
        source: "Kenney via Poly Pizza",
        license: "CC0 / bundle",
        url: "https://poly.pizza/bundle/Furniture-Kit-NoG1sEUD1z",
      },
      {
        id: "furniture-explore",
        label: "Furniture & Decor",
        category: "Bibliotecas",
        source: "Poly Pizza",
        license: "Misto",
        url: "https://poly.pizza/explore/Furniture-and-Decor",
      },
      {
        id: "kenney-assets",
        label: "Catalogo Kenney",
        category: "Bibliotecas",
        source: "Kenney",
        license: "Kenney License",
        url: "https://www.kenney.nl/assets",
      },
    ],
  },
];
