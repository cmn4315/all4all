/* eslint-disable no-undef */
const { Builder, By, until, Key } = require("selenium-webdriver");
const chrome = require('selenium-webdriver/chrome');

// Single shared driver for all tests
const options = new chrome.Options();
if (process.env.CI) {
  options.addArguments('--headless');
}
options.addArguments('--no-sandbox');
options.addArguments('--disable-dev-shm-usage');
const driver = new Builder().forBrowser('chrome').setChromeOptions(options).build();

afterAll(async () => {
  const coverage = await driver.executeScript('return window.__coverage__');
  const fs = require('fs');
  fs.mkdirSync('./.nyc_output', { recursive: true });
  fs.writeFileSync(
    `./.nyc_output/coverage-${Date.now()}.json`,
    JSON.stringify(coverage)
  );
  await driver.quit();
});

describe("Home Page", () => {
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

    let error;

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

  }, 30000);



});

describe("OrgForm", () => {
  // Helper: navigate to the OrgForm tab before each test
  beforeEach(async () => {
    await driver.get("http://localhost:5173");
    const tab = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Register Org']")),
      10000
    );
    await tab.click();
  });

  // ─── FIELD VISIBILITY ────────────────────────────────────────────────────────

  /**
   * Confirms all required form fields are present on the OrgForm
   */
  test("OrgForm renders all required fields", async () => {
    await driver.wait(until.elementLocated(By.css("input[placeholder='green_earth_org']")), 10000);

    const fields = await Promise.all([
      driver.findElement(By.css("input[placeholder='green_earth_org']")),
      driver.findElement(By.css("input[placeholder='Green Earth Foundation']")),
      driver.findElement(By.css("input[placeholder='info@org.org']")),
      driver.findElement(By.css("input[placeholder='(555) 000-0000']")),
      driver.findElement(By.css("input[placeholder='Create a password']")),
      driver.findElement(By.css("input[placeholder='Repeat password']")),
      driver.findElement(By.css("input[placeholder='90210']")),
      driver.findElement(By.css("textarea[placeholder^='We plant trees']")),
    ]);

    for (const field of fields) {
      expect(await field.isDisplayed()).toBe(true);
    }
  }, 30000);

  // ─── SUBMIT VALIDATION ───────────────────────────────────────────────────────

  /**
   * Clicking Register with no fields filled should show a submit error
   */
  test("Submit with empty form shows error", async () => {
    const submitBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Register Organization']")),
      10000
    );
    await submitBtn.click();

    const err = await driver.wait(
      until.elementLocated(By.className("a4a-submit-err")),
      10000
    );
    expect(await err.getText()).toBe("Please fix the errors above.");
  }, 30000);

  /**
   * Business name field should show an inline error when left empty on submit
   */
  test("Empty business name shows inline error", async () => {
    const submitBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Register Organization']")),
      10000
    );
    await submitBtn.click();

    // The bizErr state produces an error element near the biz name input
    const errors = await driver.wait(
      until.elementsLocated(By.className("a4a-err")),
      10000
    );
    const texts = await Promise.all(errors.map((e) => e.getText()));
    expect(texts.some((t) => t.includes("Business name is required."))).toBe(true);
  }, 30000);

  /**
   * Motto field should show an inline error when left empty on submit
   */
  test("Empty motto shows inline error", async () => {
    const submitBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Register Organization']")),
      10000
    );
    await submitBtn.click();

    const errors = await driver.wait(
      until.elementsLocated(By.className("a4a-err")),
      10000
    );
    const texts = await Promise.all(errors.map((e) => e.getText()));
    expect(texts.some((t) => t.includes("Motto / summary is required."))).toBe(true);
  }, 30000);

  /**
   * A motto that is too short (< 10 chars) should show a length error
   */
  test("Short motto shows length error", async () => {
    const textarea = await driver.wait(
      until.elementLocated(By.css("textarea[placeholder^='We plant trees']")),
      10000
    );
    await textarea.sendKeys("Hi");

    const submitBtn = await driver.findElement(By.xpath("//button[text()='Register Organization']"));
    await submitBtn.click();

    const errors = await driver.wait(
      until.elementsLocated(By.className("a4a-err")),
      10000
    );
    const texts = await Promise.all(errors.map((e) => e.getText()));
    expect(texts.some((t) => t.includes("Please write at least 10 characters."))).toBe(true);
  }, 30000);

  /**
   * Submitting without selecting a category should show a category error
   */
  test("No category selected shows category error", async () => {
    const submitBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Register Organization']")),
      10000
    );
    await submitBtn.click();

    const errors = await driver.wait(
      until.elementsLocated(By.className("a4a-err")),
      10000
    );
    const texts = await Promise.all(errors.map((e) => e.getText()));
    expect(texts.some((t) => t.includes("Please select a category."))).toBe(true);
  }, 30000);

  // ─── PHONE FORMATTING ────────────────────────────────────────────────────────

  /**
   * Typing digits into the phone field should auto-format them as (555) 000-0000
   */
  test("Phone field formats input correctly", async () => {
    const phoneInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='(555) 000-0000']")),
      10000
    );
    await phoneInput.sendKeys("5550001234");

    const val = await phoneInput.getAttribute("value");
    expect(val).toBe("(555) 000-1234");
  }, 30000);

  /**
   * An invalid phone number should show an inline error
   */
  test("Invalid phone number shows error", async () => {
    const phoneInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='(555) 000-0000']")),
      10000
    );
    await phoneInput.sendKeys("123"); // too short

    const submitBtn = await driver.findElement(By.xpath("//button[text()='Register Organization']"));
    await submitBtn.click();

    const errors = await driver.wait(
      until.elementsLocated(By.className("a4a-err")),
      10000
    );
    const texts = await Promise.all(errors.map((e) => e.getText()));
    expect(texts.some((t) => t.length > 0)).toBe(true);
  }, 30000);

  // ─── ZIP CODE ────────────────────────────────────────────────────────────────

  /**
   * An invalid ZIP code should show an inline error
   */
  test("Invalid ZIP code shows error", async () => {
    const zipInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='90210']")),
      10000
    );
    await zipInput.sendKeys("123"); // too short

    // blur to trigger validation
    await zipInput.sendKeys(Key.TAB);

    const errors = await driver.wait(
      until.elementsLocated(By.className("a4a-err")),
      10000
    );
    const texts = await Promise.all(errors.map((e) => e.getText()));
    expect(texts.some((t) => t.length > 0)).toBe(true);
  }, 30000);

  // ─── PASSWORD ────────────────────────────────────────────────────────────────

  /**
   * Typing a password should reveal the strength bar and label
   */
  test("Password strength bar appears when typing", async () => {
    const passInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Create a password']")),
      10000
    );
    await passInput.sendKeys("Test123!");

    const strengthBar = await driver.wait(
      until.elementLocated(By.className("a4a-strength-bar")),
      10000
    );
    const strengthLabel = await driver.wait(
      until.elementLocated(By.className("a4a-strength-label")),
      10000
    );

    expect(await strengthBar.isDisplayed()).toBe(true);
    expect(await strengthLabel.getText()).not.toBe("");
  }, 30000);

  /**
   * Mismatched passwords should show a confirm error
   */
  test("Mismatched passwords show confirm error", async () => {
    const passInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Create a password']")),
      10000
    );
    await passInput.sendKeys("Password1!");

    const confirmInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Repeat password']")),
      10000
    );
    await confirmInput.sendKeys("DifferentPass1!");

    const errors = await driver.wait(
      until.elementsLocated(By.className("a4a-err")),
      10000
    );
    const texts = await Promise.all(errors.map((e) => e.getText()));
    expect(texts.some((t) => t.includes("Passwords do not match."))).toBe(true);
  }, 30000);

  /**
   * Matching passwords should produce no confirm error
   */
  test("Matching passwords clears confirm error", async () => {
    const passInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Create a password']")),
      10000
    );
    await passInput.sendKeys("Password1!");

    const confirmInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Repeat password']")),
      10000
    );
    await confirmInput.sendKeys("Password1!");

    // give React a tick to clear the error
    await driver.sleep(300);

    const errors = await driver.findElements(By.className("a4a-err"));
    const texts = await Promise.all(errors.map((e) => e.getText()));
    expect(texts.some((t) => t.includes("Passwords do not match."))).toBe(false);
  }, 30000);

  // ─── LOGO UPLOAD ─────────────────────────────────────────────────────────────

  /**
   * The "Upload Logo" button should be present and clickable
   */
  test("Upload Logo button is present", async () => {
    const uploadBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Upload Logo']")),
      10000
    );
    expect(await uploadBtn.isDisplayed()).toBe(true);
  }, 30000);

  // ─── CATEGORY DROPDOWN ───────────────────────────────────────────────────────

  /**
   * The category dropdown should contain at least the default placeholder option
   */
  test("Category dropdown renders placeholder option", async () => {
    const select = await driver.wait(
      until.elementLocated(By.css("select.a4a-input")),
      10000
    );
    const defaultOption = await select.findElement(By.css("option[value='']"));
    expect(await defaultOption.getText()).toBe("— Select a category —");
  }, 30000);

  /**
   * Selecting a category should clear the category error
   */
  test("Selecting a category clears category error", async () => {
    // First trigger the error
    const submitBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Register Organization']")),
      10000
    );
    await submitBtn.click();

    // Now pick a category (assumes at least one exists from the API)
    const select = await driver.findElement(By.css("select.a4a-input"));
    const options = await select.findElements(By.css("option"));
    if (options.length > 1) {
      await options[1].click(); // pick the first real option
      await driver.sleep(300);

      const errors = await driver.findElements(By.className("a4a-field-err"));
      const texts = await Promise.all(errors.map((e) => e.getText()));
      expect(texts.some((t) => t.includes("Please select a category."))).toBe(false);
    }
  }, 30000);
});

describe("ColorWheelPicker", () => {
  beforeEach(async () => {
    await driver.get("http://localhost:5173");
    const tab = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Register Org']")),
      10000
    );
    await tab.click();
    // Scroll the color picker into view
    const picker = await driver.wait(
      until.elementLocated(By.className("a4a-color-picker-wrap")),
      10000
    );
    await driver.executeScript("arguments[0].scrollIntoView({block: 'center'})", picker);
    await driver.sleep(300);
  });

  /**
   * The color picker, hex input, and add button should all be present
   */
  test("ColorWheelPicker renders all elements", async () => {
    const wheel = await driver.findElement(By.className("a4a-color-wheel"));
    const hexInput = await driver.findElement(By.css("input[placeholder='#16a34a']"));
    const addBtn = await driver.findElement(By.className("a4a-add-btn"));

    expect(await wheel.isDisplayed()).toBe(true);
    expect(await hexInput.isDisplayed()).toBe(true);
    expect(await addBtn.isDisplayed()).toBe(true);
  }, 30000);

  /**
   * Typing a valid hex into the text input and clicking Add should add a color chip
   */
  test("Adding a valid hex color adds a chip", async () => {
    const hexInput = await driver.findElement(By.css("input[placeholder='#16a34a']"));
    await hexInput.sendKeys(Key.CONTROL + "a");
    await hexInput.sendKeys(Key.DELETE);
    await hexInput.sendKeys("#ff5733");

    const addBtn = await driver.findElement(By.className("a4a-add-btn"));
    await driver.executeScript("arguments[0].click()", addBtn);

    const chip = await driver.wait(
      until.elementLocated(By.className("a4a-color-chip__hex")),
      10000
    );
    expect(await chip.getText()).toBe("#ff5733");
  }, 30000);

  /**
   * Typing an invalid hex and clicking Add should show an error
   */
  test("Adding an invalid hex shows error", async () => {
    const hexInput = await driver.findElement(By.css("input[placeholder='#16a34a']"));
    await hexInput.sendKeys(Key.CONTROL + "a");
    await hexInput.sendKeys(Key.DELETE);
    await hexInput.sendKeys("notahex");

    const addBtn = await driver.findElement(By.className("a4a-add-btn"));
    await driver.executeScript("arguments[0].click()", addBtn);

    const err = await driver.wait(
      until.elementLocated(By.className("a4a-err")),
      10000
    );
    expect(await err.getText()).toContain("Enter a valid hex");
  }, 30000);

  /**
   * Adding the same color twice should show a duplicate error
   */
  test("Adding a duplicate color shows error", async () => {
    const hexInput = await driver.findElement(By.css("input[placeholder='#16a34a']"));
    const addBtn = await driver.findElement(By.className("a4a-add-btn"));

    await hexInput.sendKeys(Key.CONTROL + "a");
    await hexInput.sendKeys(Key.DELETE);
    await hexInput.sendKeys("#aabbcc");
    await driver.executeScript("arguments[0].click()", addBtn);

    await driver.sleep(300);

    await hexInput.sendKeys(Key.CONTROL + "a");
    await hexInput.sendKeys(Key.DELETE);
    await hexInput.sendKeys("#aabbcc");
    await driver.executeScript("arguments[0].click()", addBtn);

    const err = await driver.wait(
      until.elementLocated(By.className("a4a-err")),
      10000
    );
    expect(await err.getText()).toContain("Already added.");
  }, 30000);

  /**
   * Adding 4 colors then attempting a 5th should show a max colors error
   */
  test("Adding more than 4 colors shows max error", async () => {
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00"];
    const addBtn = await driver.findElement(By.className("a4a-add-btn"));

    for (const color of colors) {
      const hexInput = await driver.findElement(By.css("input[placeholder='#16a34a']"));
      await hexInput.sendKeys(Key.CONTROL + "a");
    await hexInput.sendKeys(Key.DELETE);
      await hexInput.sendKeys(color);
      await driver.executeScript("arguments[0].click()", addBtn);
      await driver.sleep(200);
    }

    // Button is now disabled — use Enter key to bypass it and trigger the max branch
    const hexInput = await driver.findElement(By.css("input[placeholder='#16a34a']"));
    await hexInput.sendKeys(Key.CONTROL + "a");
    await hexInput.sendKeys(Key.DELETE);
    await hexInput.sendKeys("#123456");
    await hexInput.sendKeys(Key.ENTER);

    const err = await driver.wait(
      until.elementLocated(By.className("a4a-err")),
      10000
    );
    expect(await err.getText()).toContain("Maximum 4 colors.");
  }, 30000);

  /**
   * Pressing Enter in the hex input should trigger addColor
   */
  test("Pressing Enter in hex input adds a color", async () => {
    const hexInput = await driver.findElement(By.css("input[placeholder='#16a34a']"));
    await hexInput.sendKeys(Key.CONTROL + "a");
    await hexInput.sendKeys(Key.DELETE);
    await hexInput.sendKeys("#123abc");
    await hexInput.sendKeys(Key.ENTER);

    const chip = await driver.wait(
      until.elementLocated(By.className("a4a-color-chip__hex")),
      10000
    );
    expect(await chip.getText()).toBe("#123abc");
  }, 30000);

  /**
   * Clicking the X button on a color chip should remove it
   */
  test("Removing a color chip removes it from the list", async () => {
    const hexInput = await driver.findElement(By.css("input[placeholder='#16a34a']"));
    const addBtn = await driver.findElement(By.className("a4a-add-btn"));

    await hexInput.sendKeys(Key.CONTROL + "a");
    await hexInput.sendKeys(Key.DELETE);
    await hexInput.sendKeys("#ff5733");
    await driver.executeScript("arguments[0].click()", addBtn);

    await driver.wait(until.elementLocated(By.className("a4a-color-chip")), 10000);

    const removeBtn = await driver.findElement(By.className("a4a-color-chip__remove"));
    await driver.executeScript("arguments[0].click()", removeBtn);

    await driver.sleep(300);

    const chips = await driver.findElements(By.className("a4a-color-chip"));
    expect(chips.length).toBe(0);
  }, 30000);

  /**
   * The color count badge should update as colors are added
   */
  test("Color count updates as colors are added", async () => {
    const addBtn = await driver.findElement(By.className("a4a-add-btn"));

    const hexInput = await driver.findElement(By.css("input[placeholder='#16a34a']"));
    await hexInput.sendKeys(Key.CONTROL + "a");
    await hexInput.sendKeys(Key.DELETE);
    await hexInput.sendKeys("#ff0000");
    await driver.executeScript("arguments[0].click()", addBtn);

    await driver.sleep(300);

    const count = await driver.wait(
      until.elementLocated(By.className("a4a-color-count")),
      10000
    );
    expect(await count.getText()).toBe("1/4");
  }, 30000);

  /**
   * Typing a valid hex into the text input should update the preview swatch
   */
  test("Valid hex input shows preview swatch", async () => {
    const hexInput = await driver.findElement(By.css("input[placeholder='#16a34a']"));
    await hexInput.sendKeys(Key.CONTROL + "a");
    await hexInput.sendKeys(Key.DELETE);
    await hexInput.sendKeys("#abc123");

    const swatch = await driver.wait(
      until.elementLocated(By.className("a4a-hex-preview")),
      10000
    );
    expect(await swatch.isDisplayed()).toBe(true);
  }, 30000);
});