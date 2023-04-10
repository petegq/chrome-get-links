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
  await Page.navigate({ url: "https://google" });

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
        const { attributes } = await DOM.describeNode({ nodeId });
        if (attributes) {
          const hrefIndex = attributes.indexOf("href");
          return hrefIndex !== -1 ? attributes[hrefIndex + 1] : null;
        }
        return null;
      })
    );

    // Filter out internal links and display external links
    const externalLinks = linkURLs.filter((url) => url && !url.startsWith("/"));
    console.log("External links found on the page:", externalLinks.length);

    // Close the client and the Chrome instance
    await client.close();
    await chrome.kill();
  });
}

runApp().catch(console.error);
