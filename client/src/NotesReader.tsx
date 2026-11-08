import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerUrl;

export default function NotesReader({ url, name }: { url: string; name: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Opening PDF...");
  useEffect(() => {
    let cancelled = false;
    const task = getDocument({ url });
    const render = async () => {
      try {
        const pdf = await task.promise;
        if (!host.current || cancelled) return;
        host.current.replaceChildren();
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled || !host.current) return;
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(1.6, Math.max(0.3, (host.current.clientWidth - 28) / base.width));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.setAttribute("aria-label", `${name}, page ${i} of ${pdf.numPages}`);
          host.current.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;
        }
        if (!cancelled) setStatus(`${pdf.numPages} page${pdf.numPages === 1 ? "" : "s"}`);
      } catch {
        if (!cancelled) setStatus("This PDF could not be displayed. Download the original to open it in a PDF app.");
      }
    };
    void render();
    return () => { cancelled = true; void task.destroy(); };
  }, [url, name]);
  return <><p className="reader-status" role="status">{status}</p><div className="pdf-pages" ref={host}/></>;
}
