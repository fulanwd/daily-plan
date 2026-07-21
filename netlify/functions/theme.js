const { getStore } = require("@netlify/blobs");

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: HEADERS, body: "" };
  }

  const store = getStore("rike");

  try {
    if (event.httpMethod === "GET") {
      const raw = await store.get("theme", { type: "text" });
      const theme = raw === "dark" ? "dark" : "light";
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ theme }),
      };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const theme = body.theme === "dark" ? "dark" : "light";
      await store.set("theme", theme);
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ ok: true, theme }),
      };
    }

    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: "method not allowed" }) };
  } catch (err) {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ theme: "light", fallback: true }),
    };
  }
};