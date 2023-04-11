const chromeLauncher = require("chrome-launcher");
const chromeRemoteInterface = require("chrome-remote-interface");

async function runApp() {
  // Launch a new Chrome instance
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--disable-gpu", "--headless"],
  });

  // Connect to the Chrome instance using the chrome-remote-interface library
  const client = await chromeRemoteInterface({
    port: chrome.port,
  });

  // Extract the required domains from the client
  const { Page, Runtime, DOM } = client;

  // Enable the required domains
  await Promise.all([Page.enable(), Runtime.enable(), DOM.enable()]);

  // Open a new tab and navigate to the specified URL
  const site = "google";
  const tld = "com";
  await Page.navigate({ url: `https://${site}.${tld}` });

  // Wait for the page to finish loading
  Page.loadEventFired(async () => {
    console.log("Page loaded successfully.");

    // Get the root document node
    const { root: document } = await DOM.getDocument();

    // Find all the <a> elements on the page
    const linkNodes = await DOM.querySelectorAll({
      nodeId: document.nodeId,
      selector: "a",
    });

    // Extract the href attribute of each link
    const linkURLs = await Promise.all(
      linkNodes.nodeIds.map(async (nodeId) => {
        const node = await DOM.describeNode({ nodeId });
        const attribs = node.node.attributes;
        if (attribs) {
          const hrefIndex = attribs.indexOf("href");
          return hrefIndex !== -1 ? attribs[hrefIndex + 1] : null;
        }
        return null;
      })
    );

    const internalLinks = linkURLs.filter(
      (url) => url && url.includes(`${site}.`)
    );

    console.log("Internal:", internalLinks.length);
    console.log(internalLinks);

    // Filter out internal links and display external links
    const externalLinks = linkURLs.filter(
      (url) =>
        url &&
        !url.startsWith("#") &&
        !url.startsWith("/") &&
        !url.includes(`${site}.`)
    );

    console.log("External:", externalLinks.length);
    console.log(externalLinks);

    await client.close();
    await chrome.kill();
  });
}

runApp().catch(console.error);
