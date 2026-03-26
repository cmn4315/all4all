const { Builder, By, until, Key } = require("selenium-webdriver");
const chrome = require('selenium-webdriver/chrome');

describe("Home Page", () => {
  const options = new chrome.Options();
  if (process.env.CI) {
    options.addArguments('--headless');
  }
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  let driver = new Builder().forBrowser('chrome').setChromeOptions(options).build();

  // stop the tests after every test has been run
  afterAll(async () => {
    await driver.quit();
  });

  /**
   * Tests that the page properly loads and the text appears
   */
  test("Load the page", async () => {
    await driver.get("http://localhost:5173");

    // Wait up to 10s for the logo div to appear
    const logo = await driver.wait(
      until.elementLocated(By.className("a4a-logo")),
      10000
    );

    const text = await logo.getText();
    expect(text).toBe("All4All");
  }, 30000);

  /**
   * On the Sign-in page there is a button telling the user to create an account
   * This tests that once clicked it brings them to the volunteers page
   */
  test("Create Account Switch", async () => {
    const buttons = await driver.wait(
      until.elementsLocated(By.className("a4a-switch-btn")),
      10000
    );
    await buttons[0].click();

    // Assert the "Join as Volunteer" tab button now has the active class
    const activeTab = await driver.wait(
      until.elementLocated(By.css(".a4a-tab.active")),
      10000
    );

    expect(await activeTab.getText()).toBe("Join as Volunteer");
  }, 30000);

  /**
   * On the volunteers page, there is a button at the bottom, when clicked, it
   * should bring the user over to the organizations page
   */
  test("Organization Switch", async () => {
    // click on the volunteer tab
    const tab = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Join as Volunteer']")),
      10000
    );
    await tab.click();

    const buttons = await driver.wait(
      until.elementsLocated(By.className("a4a-switch-btn")),
      10000
    );
    await buttons[0].click(); // click the switch button

    const activeTab = await driver.wait(
      until.elementLocated(By.css(".a4a-tab.active")),
      10000
    );

    expect(await activeTab.getText()).toBe("Register Org");
  }, 30000);

  /**
   * On the organizations page, there is a button on the bottom, when clicked
   * it should bring the user to the volunteers page
   */
  test("Org to Volunteer Switch", async () => {
    // click into the org tab
    const tab = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Register Org']")),
      10000
    );
    await tab.click();

    const buttons = await driver.wait(
      until.elementsLocated(By.className("a4a-switch-btn")),
      10000
    );
    await buttons[0].click();

    const activeTab = await driver.wait(
      until.elementLocated(By.css(".a4a-tab.active")),
      10000
    );

    expect(await activeTab.getText()).toBe("Join as Volunteer");
  }, 30000);

  /**
   * When a user is attempting to sign in, if either the username or passwords fields
   * are left blank it will display an error message
   */
  test("Not Enough Provided Sign In", async () => {
    // make sure to be on the sign in tab
    const tab = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Sign In']")),
      10000
    );
    await tab.click();

    // click the button with nothing filled in
    const buttons = await driver.wait(
      until.elementsLocated(By.className("a4a-btn")),
      10000
    );
    await buttons[0].click();

     // Wait for the error message to appear and assert
    error = await driver.wait(
      until.elementLocated(By.className("a4a-err")),
      10000
    );

    expect(await error.getText()).toBe("Please fill in all fields.");

    const usernameInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Your Username']")),
      10000
    );
    await usernameInput.sendKeys("testuser");
    await buttons[0].click(); // click with only the username typed in

    error = await driver.wait(
      until.elementLocated(By.className("a4a-err")),
      10000
    );

    expect(await error.getText()).toBe("Please fill in all fields.");
    
    await usernameInput.sendKeys(Key.CONTROL + "a", Key.DELETE); //reset

    const passwordInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Your Password']")),
      10000
    );
    await passwordInput.sendKeys("testpassword");
    await buttons[0].click(); // click with only the password

    error = await driver.wait(
      until.elementLocated(By.className("a4a-err")),
      10000
    );

    expect(await error.getText()).toBe("Please fill in all fields.");
    
    await usernameInput.sendKeys("testuser"); // fill in username and try again, different error
    await buttons[0].click();

    error = await driver.wait(
      until.elementLocated(By.className("a4a-err")),
      10000
    );

    expect(await error.getText()).toBe("Username not found.");

  }, 30000);
});