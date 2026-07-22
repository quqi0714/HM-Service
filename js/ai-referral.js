(function trackAiReferral() {
  const sources = [
    ["chatgpt.com", "chatgpt"],
    ["chat.openai.com", "chatgpt"],
    ["perplexity.ai", "perplexity"],
    ["copilot.microsoft.com", "microsoft_copilot"],
    ["gemini.google.com", "gemini"],
    ["claude.ai", "claude"],
    ["poe.com", "poe"],
    ["you.com", "you"],
  ];

  try {
    if (typeof window.gtag !== "function") return;

    const utmSource = new URLSearchParams(window.location.search).get("utm_source")?.toLowerCase() || "";
    const referrerHost = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
    const match = sources.find(([domain]) => {
      return (
        utmSource === domain ||
        utmSource.endsWith(`.${domain}`) ||
        referrerHost === domain ||
        referrerHost.endsWith(`.${domain}`)
      );
    });
    if (!match) return;

    window.gtag("event", "ai_referral_visit", {
      ai_source: match[1],
      referrer_host: referrerHost || "unavailable",
      detection_method: utmSource ? "utm_source" : "referrer",
      landing_path: window.location.pathname,
      transport_type: "beacon",
    });
  } catch {
    // 分析增强失败不得影响页面或咨询流程。
  }
})();
