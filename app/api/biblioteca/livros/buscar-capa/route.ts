import { type NextRequest, NextResponse } from "next/server";

interface Capa {
  capa: string;
  autor: string | null;
  isbn: string | null;
}

const TEMPO_LIMITE = 8000;

const TAMANHOS_CAPA = [
  "extraLarge",
  "large",
  "medium",
  "small",
  "thumbnail",
  "smallThumbnail",
] as const;

interface VolumeGoogle {
  volumeInfo?: {
    authors?: string[];
    imageLinks?: Record<string, string>;
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

function extrairCapaGoogle(volume: VolumeGoogle): string | null {
  const imagens = volume.volumeInfo?.imageLinks;
  if (!imagens) {
    return null;
  }

  for (const tamanho of TAMANHOS_CAPA) {
    const url = imagens[tamanho];

    if (url) {
      return url.replace(/^http:\/\//, "https://").replace(/&edge=curl/g, "");
    }
  }

  return null;
}

async function buscarNoGoogle(
  titulo: string,
  autor: string | null,
): Promise<Capa | null> {
  const parametros = new URLSearchParams({
    q: autor
      ? `intitle:"${titulo}" inauthor:"${autor}"`
      : `intitle:"${titulo}"`,
    maxResults: "10",
    printType: "books",
    country: "BR",
  });

  const chave = process.env.GOOGLE_BOOKS_API_KEY;
  if (chave) {
    parametros.set("key", chave);
  }

  const resposta = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${parametros}`,
    { signal: AbortSignal.timeout(TEMPO_LIMITE) },
  );

  if (!resposta.ok) {
    console.warn(`Google Books respondeu ${resposta.status}`);
    return null;
  }

  const dados = (await resposta.json()) as { items?: VolumeGoogle[] };

  for (const volume of dados.items ?? []) {
    const capa = extrairCapaGoogle(volume);
    if (!capa) {
      continue;
    }

    const info = volume.volumeInfo;
    return {
      capa,
      autor: info?.authors?.[0] ?? null,
      isbn:
        info?.industryIdentifiers?.find(
          (id) => id.type === "ISBN_13" || id.type === "ISBN_10",
        )?.identifier ?? null,
    };
  }

  return null;
}

interface DocOpenLibrary {
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
}

async function buscarNaOpenLibrary(
  titulo: string,
  autor: string | null,
): Promise<Capa | null> {
  const parametros = new URLSearchParams({
    title: titulo,
    limit: "10",
    fields: "author_name,cover_i,isbn",
  });
  if (autor) {
    parametros.set("author", autor);
  }

  const resposta = await fetch(
    `https://openlibrary.org/search.json?${parametros}`,
    { signal: AbortSignal.timeout(TEMPO_LIMITE) },
  );

  if (!resposta.ok) {
    console.warn(`Open Library respondeu ${resposta.status}`);
    return null;
  }

  const dados = (await resposta.json()) as { docs?: DocOpenLibrary[] };
  const doc = dados.docs?.find((item) => item.cover_i);
  if (!doc?.cover_i) {
    return null;
  }

  return {
    capa: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
    autor: doc.author_name?.[0] ?? null,
    isbn: doc.isbn?.[0] ?? null,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const titulo = searchParams.get("titulo")?.trim();
  const autor = searchParams.get("autor")?.trim() || null;

  if (!titulo) {
    return NextResponse.json(
      { error: "Título é obrigatório" },
      { status: 400 },
    );
  }

  try {
    const resultado =
      (await buscarNoGoogle(titulo, autor)) ??
      (await buscarNaOpenLibrary(titulo, autor)) ??
      (autor ? await buscarNaOpenLibrary(titulo, null) : null);

    return NextResponse.json(
      resultado ?? { capa: null, autor: null, isbn: null },
    );
  } catch (error) {
    console.error("Erro ao buscar capa do livro:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o serviço de capas." },
      { status: 502 },
    );
  }
}
