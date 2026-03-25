let toonModulePromise: Promise<typeof import("@toon-format/toon")> | null = null;

function importToonModule(): Promise<typeof import("@toon-format/toon")> {
  if (!toonModulePromise) {
    const importer = new Function(
      "specifier",
      "return import(specifier)",
    ) as (specifier: string) => Promise<typeof import("@toon-format/toon")>;

    toonModulePromise = importer("@toon-format/toon");
  }

  return toonModulePromise;
}

export async function encodeToon(input: unknown): Promise<string> {
  const { encode } = await importToonModule();
  return encode(input);
}
