import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const titulo = searchParams.get("titulo");
    const autor = searchParams.get("autor");

    if (!titulo) {
      return NextResponse.json(
        { error: "Título é obrigatório" },
        { status: 400 },
      );
    }

    let query = titulo;
    if (autor) {
      query += ` ${autor}`;
    }

    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query,
    )}&maxResults=1`;

    const response = await fetch(googleBooksUrl);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const book = data.items[0];
      const imageLinks = book.volumeInfo?.imageLinks;

      const capaUrl =
        imageLinks?.large ||
        imageLinks?.medium ||
        imageLinks?.thumbnail ||
        imageLinks?.smallThumbnail;

      if (capaUrl) {
        const httpsUrl = capaUrl.replace("http://", "https://");

        return NextResponse.json({
          capa: httpsUrl,
          titulo: book.volumeInfo?.title || titulo,
          autor: book.volumeInfo?.authors?.[0] || autor,
          isbn: book.volumeInfo?.industryIdentifiers?.find(
            (id: any) => id.type === "ISBN_13" || id.type === "ISBN_10",
          )?.identifier,
        });
      }
    }

    return NextResponse.json({
      capa: `/placeholder.svg?height=200&width=150&text=${encodeURIComponent(
        titulo,
      )}`,
      titulo,
      autor,
    });
  } catch (error) {
    console.error("Erro ao buscar capa do livro:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
