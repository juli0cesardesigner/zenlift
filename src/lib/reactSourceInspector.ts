import { TargetElementInfo, CodeLocationInfo } from "../types/feedback";

/**
 * Utilitário cirúrgico para inspecionar nós do DOM e extrair Fiber React,
 * caminho de arquivos, números de linhas, hierarquia de componentes e metadados contextuais.
 */

// Limpa caminhos internos do Webpack / Next.js
function cleanSourcePath(rawPath?: string): string | undefined {
  if (!rawPath) return undefined;
  let cleaned = rawPath
    .replace(/^webpack-internal:\/\/\/\(app-pages-browser\)\/\.\//, "")
    .replace(/^webpack-internal:\/\/\/\.\//, "")
    .replace(/^webpack:\/\/\/\.\//, "")
    .replace(/^\.\//, "");

  // Formata barras
  cleaned = cleaned.replace(/\\/g, "/");
  return cleaned;
}

// Extrai nome amigável do componente React
function getComponentName(fiberType: any): string | null {
  if (!fiberType) return null;
  if (typeof fiberType === "string") return fiberType;
  if (typeof fiberType === "function") {
    return fiberType.displayName || fiberType.name || null;
  }
  if (typeof fiberType === "object") {
    if (fiberType.displayName) return fiberType.displayName;
    if (fiberType.name) return fiberType.name;
    if (fiberType.render) {
      return fiberType.render.displayName || fiberType.render.name || null;
    }
  }
  return null;
}

// Extrai props relevantes (strings, numbers, booleans)
function extractSafeProps(props: any): Record<string, string | number | boolean> | undefined {
  if (!props || typeof props !== "object") return undefined;
  const result: Record<string, string | number | boolean> = {};

  const interestingKeys = [
    "id",
    "name",
    "title",
    "label",
    "exerciseId",
    "planId",
    "workoutId",
    "type",
    "variant",
    "mode",
    "role",
    "aria-label",
    "data-testid",
  ];

  for (const key of Object.keys(props)) {
    const val = props[key];
    if (interestingKeys.includes(key) || key.startsWith("data-")) {
      if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
        result[key] = typeof val === "string" && val.length > 50 ? val.slice(0, 50) + "..." : val;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// Detecta ícones Lucide através de classes do SVG
function detectLucideIcon(element: HTMLElement): string | null {
  // Procura no próprio elemento ou dentro/próximo
  const svg = element.tagName.toLowerCase() === "svg" ? element : element.closest("svg") || element.querySelector("svg");
  if (svg) {
    const classList = Array.from(svg.classList);
    for (const cls of classList) {
      if (cls.startsWith("lucide-")) {
        const iconSlug = cls.replace("lucide-", "");
        // Converte kebab-case para PascalCase (ex: trash-2 -> Trash2, chevron-right -> ChevronRight)
        const pascal = iconSlug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("");
        return `${pascal} (Lucide Icon)`;
      }
    }
    return "SVG Icon";
  }
  return null;
}

// Encontra o container semântico mais próximo
function findClosestContext(element: HTMLElement): { title?: string; role?: string } {
  // Tenta encontrar cabeçalho próximo
  const section = element.closest("section, article, main, header, form, [role='dialog'], [data-card]");
  let title: string | undefined;

  if (section) {
    const heading = section.querySelector("h1, h2, h3, h4, h5, h6");
    if (heading && heading.textContent) {
      title = heading.textContent.replace(/\s+/g, " ").trim().slice(0, 40);
    }
  }

  // Se estiver dentro de um botão ou link
  const buttonOrLink = element.closest("button, a");
  if (buttonOrLink) {
    const btnLabel =
      buttonOrLink.getAttribute("aria-label") ||
      buttonOrLink.getAttribute("title") ||
      buttonOrLink.textContent?.replace(/\s+/g, " ").trim();
    if (btnLabel) {
      title = `Botão/Ação: "${btnLabel.slice(0, 35)}"`;
    }
  }

  return { title };
}

// Extrai caminho CSS do elemento
function getCssPath(el: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE && path.length < 5) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    } else if (current.className && typeof current.className === "string") {
      const meaningfulClass = current.className
        .split(" ")
        .filter((c) => c && !c.includes(":") && !c.startsWith("bg-") && !c.startsWith("p-") && !c.startsWith("text-"))[0];
      if (meaningfulClass) {
        selector += `.${meaningfulClass}`;
      }
    }
    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(" > ");
}

/**
 * Inspeciona profundamente o DOM e o Fiber React para extrair origem de código
 */
export function inspectElementSurgically(
  element: HTMLElement,
  clientX: number,
  clientY: number
): TargetElementInfo {
  const rect = element.getBoundingClientRect();
  const screenW = window.innerWidth || 1;
  const screenH = window.innerHeight || 1;
  const xPercentage = Math.min(100, Math.max(0, (clientX / screenW) * 100));
  const yPercentage = Math.min(100, Math.max(0, (clientY / screenH) * 100));

  // Detecta ícone
  const iconName = detectLucideIcon(element);

  // Snippet de texto refinado
  let rawText = element.innerText || element.textContent || "";
  rawText = rawText.replace(/\s+/g, " ").trim();
  let textSnippet = rawText.slice(0, 70);

  if (!textSnippet && iconName) {
    textSnippet = `Ícone <${iconName}>`;
  }

  // Contexto semântico
  const context = findClosestContext(element);
  const domPath = getCssPath(element);

  // Atributos HTML úteis
  const attributes: Record<string, string> = {};
  if (element.id) attributes.id = element.id;
  if (element.getAttribute("aria-label")) attributes["aria-label"] = element.getAttribute("aria-label")!;
  if (element.getAttribute("title")) attributes.title = element.getAttribute("title")!;
  if (element.getAttribute("role")) attributes.role = element.getAttribute("role")!;
  if (element.getAttribute("data-testid")) attributes["data-testid"] = element.getAttribute("data-testid")!;

  // Inspeção do React Fiber
  const codeLocation: CodeLocationInfo = {};
  const componentStack: string[] = [];

  try {
    // Procura chave do Fiber no elemento ou ancestrais
    let currEl: HTMLElement | null = element;
    let fiberNode: any = null;

    while (currEl && !fiberNode) {
      const fiberKey = Object.keys(currEl).find(
        (key) => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")
      );
      if (fiberKey) {
        fiberNode = (currEl as any)[fiberKey];
      } else {
        currEl = currEl.parentElement;
      }
    }

    if (fiberNode) {
      let curr = fiberNode;
      let depth = 0;

      while (curr && depth < 30) {
        const compName = getComponentName(curr.type);

        // Se for um componente React com nome (não tag HTML padrão)
        if (compName && compName !== curr.type && typeof curr.type !== "string") {
          if (!componentStack.includes(compName) && !compName.startsWith("motion.")) {
            componentStack.push(compName);
          }
        }

        // Tenta capturar debugSource do Fiber
        if (!codeLocation.fileName && curr._debugSource) {
          codeLocation.fileName = cleanSourcePath(curr._debugSource.fileName);
          codeLocation.lineNumber = curr._debugSource.lineNumber;
          codeLocation.columnNumber = curr._debugSource.columnNumber;
        }

        // Tenta capturar do _debugOwner
        if (!codeLocation.fileName && curr._debugOwner?._debugSource) {
          codeLocation.fileName = cleanSourcePath(curr._debugOwner._debugSource.fileName);
          codeLocation.lineNumber = curr._debugOwner._debugSource.lineNumber;
          codeLocation.columnNumber = curr._debugOwner._debugSource.columnNumber;
        }

        // Captura props do componente mais específico
        if (!codeLocation.propsSnippet && curr.memoizedProps) {
          const extracted = extractSafeProps(curr.memoizedProps);
          if (extracted) {
            codeLocation.propsSnippet = extracted;
          }
        }

        curr = curr.return;
        depth++;
      }
    }
  } catch (err) {
    console.warn("[ReactSourceInspector] Erro ao analisar Fiber:", err);
  }

  codeLocation.componentStack = componentStack.slice(0, 6);
  codeLocation.componentName = componentStack[0] || undefined;

  let selector = element.tagName.toLowerCase();
  if (element.id) {
    selector += `#${element.id}`;
  } else if (element.className && typeof element.className === "string") {
    const firstClass = element.className.split(" ").filter((c) => c && !c.includes(":"))[0];
    if (firstClass) selector += `.${firstClass}`;
  }

  return {
    selector,
    tagName: element.tagName,
    textSnippet: textSnippet || "(Elemento sem texto visível)",
    iconName: iconName || undefined,
    closestContainerTitle: context.title || undefined,
    parentComponent: codeLocation.componentName || undefined,
    codeLocation,
    domPath,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    xPercentage,
    yPercentage,
    scrollX: window.scrollX || 0,
    scrollY: window.scrollY || 0,
    boundingRect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
  };
}
