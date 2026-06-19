---
version: alpha
name: IronSilicon-PWA-Stealth-Breit
stack:
  framework: Next.js (App Router)
  styling: Tailwind CSS
  hosting: Vercel
  database: Local-First (IndexedDB + Supabase Sync)
colors:
  primary: "#FF4103"    # Tiffany (Execução Ativa e Cargas)
  secondary: "#555555"  # Cinza Concreto (Histórico e Estados Inativos)
  neutral: "#001621"    # Dark Gray (Fundo do Canvas / Canvas Base)
  surface: "#001621"    # Dark Gray
  on-surface: "#FFFFFF" # Branco Puro (Títulos Estruturais)
typography:
  headline-display:
    fontFamily: Söhne Breit
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: -0.01em
  body-md:
    fontFamily: Söhne
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.4
  label-mono:
    fontFamily: Söhne Mono
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.03em
rounded:
  none: 0px
spacing:
  base: 16px
  sm: 8px
  md: 16px
  lg: 32px
---

# Design System - IronSilicon (PWA Stealth Edition)

## Overview
Uma interface Web App (PWA) de altíssimo contraste e emissão de luz severamente controlada. Projetado para rodar em modo standalone (tela cheia, ocultando a barra de endereços do navegador). O layout utiliza um modelo fluido para dispositivos móveis e um contêiner de largura máxima fixa e centralizado para visualização em desktops, garantindo que a rigidez industrial do grid brutalista nunca quebre.

## PWA & Web Identity
- **Display Mode**: Standalone puro. A interface deve ignorar elementos de navegação do browser, comportando-se como um bloco sólido de software.
- **Fundo do Body** (#001621): Dark Gray contínuo para evitar flashes brancos durante o carregamento inicial (via Service Worker).
- **Responsividade**: Em telas mobile, expansão total (Fluid). Em telas de desktop, a interface se autocentraliza em um bloco vertical rígido (Max-Width: 480px), simulando um dispositivo físico na web.

## Typography & Components
- **Fontes**: Família Söhne (Breit para impacto, Mono para telemetria e cronômetros estáveis). As fontes devem ser cacheadas localmente para renderização em menos de 50ms.
- **Componentes Gestuais**: Zonas de interação baseadas em Web Touch APIs (`touchstart` e `touchend`), otimizadas para navegadores mobile sem o atraso padrão de 300ms de cliques web.

## Do's and Don'ts
- Do forçar o fundo da página inteira (incluindo metatags de cor do tema do PWA) para Dark Gray (#001621).
- Don't permitir rolagem elástica de página (overscroll-behavior: none) para manter a sensação de app nativo fixo.
- Do desativar a seleção de texto por toque (-webkit-user-select: none) para não quebrar a usabilidade gestual.