const { addonBuilder, getRouter } = require("stremio-addon-sdk");
const needle = require("needle");
const webshare = require("./webshare");
const { findShowInfo } = require("./meta");
const express = require("express");
const path = require("path");
const dev = process.argv.includes("--dev") == 1 ? "Dev" : "";

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
  id: "community.coffei.webshare" + dev,
  version: "0.3.2",
  catalogs: [],
  resources: ["stream"],
  types: ["movie", "series"],
  name: "Webshare.cz" + dev,
  description: "Simple webshare.cz search and streaming.",
  idPrefixes: ["tt"],
  behaviorHints: { configurable: true, configurationRequired: true },
  config: [
    {
      key: "login",
      type: "text",
      title: "Webshare.cz login - username or email",
      required: true,
    },
    {
      key: "password",
      type: "password",
      title: "Webshare.cz password",
      required: true,
    },
  ],
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async function(args) {
  try {
    const info = await findShowInfo(args.type, args.id);
    if (info) {
      const config = args.config || {};
      const wsToken = await webshare.login(config.login, config.password);
      const streams = await webshare.search(info, wsToken);

      return { streams: streams };
    }
  } catch (error) {
    console.error(
      "Error to get streams: ",
      error.code,
      error.message,
      error.stack,
    );
  }
  return { streams: [] };
});

const app = express();

// Add the Stremio router for handling addon endpoints - getRouter converts it to express routers
app.use(getRouter(builder.getInterface()));

// Add middleware for CORS support
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.send();
  } else {
    next();
  }
});

//!!! according to the docs, getRouter should provide landing page, but it doesn't for some reason, so I created a custom landing page routers

// Serve static files from SDK (required for the configuration page)
const sdkPath = path.dirname(require.resolve("stremio-addon-sdk/package.json"));
app.use("/static", express.static(path.join(sdkPath, "static")));

// Add root route to serve the landing page
app.get(["/configure", "/"], (req, res) => {
  const landingTemplate = require("stremio-addon-sdk/src/landingTemplate");
  const landingHTML = landingTemplate(manifest);
  res.setHeader("content-type", "text/html");
  res.end(landingHTML);
});

// Custom getUrl endpoint
app.get("/getUrl/:ident", async (req, res) => {
  try {
    const ident = req.params.ident;
    const url = await webshare.getUrl(ident, req.query.token);

    const now = new Date()
    // Expires 5 hours from now.
    const expiration = new Date(now.getTime() + 5 * 60 * 60 * 1000)
    res.set('Expires', expiration.toUTCString())
    res.set('Last-Modified', now.toUTCString())
    res.set('Cache-Control', 'max-age=18000, must-revalidate, proxy-revalidate');

    res.redirect(url);
  } catch (error) {
    console.error("Error in getUrl: ", error.code, error.message, error.stack);
  }
});

module.exports = app;
