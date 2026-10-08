import { type NextRequest, NextResponse } from "next/server";

interface CoverResult {
  capa: string;
  autor: string | null;
  isbn: string | null;
}

const TIMEOUT_MS = 8000;

const COVER_SIZES = [
  "extraLarge",
  "large",
  "medium",
  "small",
  "thumbnail",
  "smallThumbnail",
] as const;

interface GoogleVolume {
  volumeInfo?: {
    authors?: string[];
    imageLinks?: Record<string, string>;
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

function extractGoogleCover(volume: GoogleVolume): string | null {
  const images = volume.volumeInfo?.imageLinks;
  if (!images) {
    return null;
  }

  for (const size of COVER_SIZES) {
    const url = images[size];

    if (url) {
      return url.replace(/^http:\/\//, "https://").replace(/&edge=curl/g, "");
    }
  }

  return null;
}

async function searchGoogle(
  title: string,
  author: string | null,
): Promise<CoverResult | null> {
  const params = new URLSearchParams({
    q: author
      ? `intitle:"${title}" inauthor:"${author}"`
      : `intitle:"${title}"`,
    maxResults: "10",
    printType: "books",
    country: "BR",
  });

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) {
    params.set("key", apiKey);
  }

  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );

  if (!response.ok) {
    console.warn(`Google Books respondeu ${response.status}`);
    return null;
  }

  const data = (await response.json()) as { items?: GoogleVolume[] };

  for (const volume of data.items ?? []) {
    const cover = extractGoogleCover(volume);
    if (!cover) {
      continue;
    }

    const info = volume.volumeInfo;
    return {
      capa: cover,
      autor: info?.authors?.[0] ?? null,
      isbn:
        info?.industryIdentifiers?.find(
          (id) => id.type === "ISBN_13" || id.type === "ISBN_10",
        )?.identifier ?? null,
    };
  }

  return null;
}

interface OpenLibraryDoc {
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
}

async function searchOpenLibrary(
  title: string,
  author: string | null,
): Promise<CoverResult | null> {
  const params = new URLSearchParams({
    title,
    limit: "10",
    fields: "author_name,cover_i,isbn",
  });
  if (author) {
    params.set("author", author);
  }

  const response = await fetch(
    `https://openlibrary.org/search.json?${params}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );

  if (!response.ok) {
    console.warn(`Open Library respondeu ${response.status}`);
    return null;
  }

  const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
  const doc = data.docs?.find((item) => item.cover_i);
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
  const title = searchParams.get("titulo")?.trim();
  const author = searchParams.get("autor")?.trim() || null;

  if (!title) {
    return NextResponse.json(
      { error: "Título é obrigatório" },
      { status: 400 },
    );
  }

  try {
    const result =
      (await searchGoogle(title, author)) ??
      (await searchOpenLibrary(title, author)) ??
      (author ? await searchOpenLibrary(title, null) : null);

    return NextResponse.json(
      result ?? { capa: null, autor: null, isbn: null },
    );
  } catch (error) {
    console.error("Erro ao buscar capa do livro:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o serviço de capas." },
      { status: 502 },
    );
  }
}
