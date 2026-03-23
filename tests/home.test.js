const { Builder, By, until } = require("selenium-webdriver");

describe("Home Page", () => {
  let driver;

  beforeEach(async () => {
    driver = await new Builder().forBrowser("chrome").build();
  });

  afterEach(async () => {
    await driver.quit();
  });

  test("renders the logo", async () => {
    await driver.get("http://localhost:5173");

    // Wait up to 10s for the logo div to appear
    const logo = await driver.wait(
      until.elementLocated(By.className("a4a-logo")),
      10000
    );

    const text = await logo.getText();
    expect(text).toBe("All4All");
  }, 30000); // 30s Jest timeout for this test
});