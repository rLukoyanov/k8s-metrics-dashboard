import { useState, useCallback } from 'react';

interface LibraryInput {
  name: string;
  version?: string;
  [key: string]: unknown;
}

interface LibraryOutput extends LibraryInput {
  license: string;
}

const EXAMPLE_INPUT = JSON.stringify(
  [
    { name: 'react', version: '18.3.1' },
    { name: 'typescript', version: '5.8.3' },
    { name: 'vite', version: '6.3.5' },
  ],
  null,
  2
);

async function fetchNpmLicense(name: string, version?: string): Promise<string> {
  const url = version
    ? `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
    : `https://registry.npmjs.org/${encodeURIComponent(name)}/latest`;

  const res = await fetch(url);
  if (!res.ok) return 'UNKNOWN';
  const data = await res.json();
  if (typeof data.license === 'string') return data.license;
  if (data.license && typeof data.license === 'object' && 'type' in data.license) {
    return String(data.license.type);
  }
  return 'UNKNOWN';
}

export default function LicenseGeneratorPage() {
  const [input, setInput] = useState(EXAMPLE_INPUT);
  const [output, setOutput] = useState<LibraryOutput[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setOutput(null);

    let parsed: LibraryInput[];
    try {
      parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) throw new Error('Ожидается массив JSON');
    } catch (e) {
      setError(`Неверный JSON: ${(e as Error).message}`);
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.all(
        parsed.map(async (lib) => {
          if (!lib.name || typeof lib.name !== 'string') {
            return { ...lib, license: 'UNKNOWN' } as LibraryOutput;
          }
          const license = await fetchNpmLicense(lib.name, lib.version as string | undefined);
          return { ...lib, license } as LibraryOutput;
        })
      );
      setOutput(results);
    } catch (e) {
      setError(`Ошибка при получении лицензий: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const outputJson = output ? JSON.stringify(output, null, 2) : '';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-800">License Generator</h1>

      <div className="flex flex-1 gap-6">
        {/* Left — input */}
        <div className="flex flex-1 flex-col gap-3">
          <label className="text-sm font-medium text-gray-600">
            Входной JSON <span className="text-gray-400">(массив библиотек)</span>
          </label>
          <textarea
            className="flex-1 resize-none rounded-lg border border-gray-300 bg-white p-4 font-mono text-sm text-gray-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            style={{ minHeight: '60vh' }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder='[{"name": "react", "version": "18.3.1"}]'
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="self-start rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Загрузка...' : 'Получить лицензии'}
          </button>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-200" />

        {/* Right — output */}
        <div className="flex flex-1 flex-col gap-3">
          <label className="text-sm font-medium text-gray-600">
            Выходной JSON <span className="text-gray-400">(с полем license)</span>
          </label>
          {loading ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <svg
                  className="h-8 w-8 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                <span className="text-sm">Запрашиваем лицензии из npm registry…</span>
              </div>
            </div>
          ) : output ? (
            <div className="relative flex-1">
              <pre className="h-full min-h-[60vh] overflow-auto rounded-lg border border-gray-200 bg-white p-4 font-mono text-sm text-gray-800 shadow-sm">
                {outputJson.split('\n').map((line, i) => {
                  const isLicenseLine = /"license"/.test(line);
                  return (
                    <span key={i} className={isLicenseLine ? 'text-blue-600 font-semibold' : ''}>
                      {line}
                      {'\n'}
                    </span>
                  );
                })}
              </pre>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(outputJson)}
                className="absolute right-3 top-3 rounded bg-gray-100 px-2 py-1 text-xs text-gray-500 hover:bg-gray-200"
              >
                Копировать
              </button>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-sm text-gray-400">
              Нажмите «Получить лицензии», чтобы увидеть результат
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
