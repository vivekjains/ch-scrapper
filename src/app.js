import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import path from "path";
import puppeteer from "puppeteer";
import helmet from "helmet";
import logger from "morgan";

const app = express();

app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());

app.use(logger("combined", {
    skip(req, res) {
        return res.statusCode < 400;
    },
}));

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cookieParser());
app.use(cors());

app.get("/", async (req, res) => {
    res.sendFile(path.join(__dirname, "/start.html"));
});

app.get("/scrapper", async (req, res) => {
    res.sendFile(path.join(__dirname, "/template2.html"));
});

app.get("/scrape", async (req, res) => {
    const browser = await puppeteer.launch({ headless: "new" });
    console.log("puppeteer launched...");
    const page = await browser.newPage();

    await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36",
    );
    console.log("url: " + req.query.u);
    await page.goto(req.query.u);
    console.log("puppeteer page fetched...");

    // Taking a screenshot of the page and saving it
    // await page.screenshot({ path: "digimon-website.png", fullPage: true });

    const result = {
        team1Name: "",
        team2Name: "",
        overNum: "",
        score: "",
        crr: "",
        reqrr: "",
        batters: [],
        bowlers: [],
        recentBalls: [],
        currentBowler: "",
        isSecondInning: false,
        matchEnded: "",
        error: false,
    };

    try {
        result.team1Name = await page.$eval(".team.clearfix.team1 b.text-uppercase", (el) => el.innerHTML);
    } catch (error) {
        result.error = true;
        console.log(error);
    }
    try {
        result.team2Name = await page.$eval(".team.clearfix.team2 b.text-uppercase", (el) => el.innerHTML);
    } catch (error) {
        result.error = true;
        console.log(error);
    }
    try {
        const overNum = await page.$eval(".end-of-over .end-title.text-uppercase", (el) => el.innerHTML);
        const overNumSplit = overNum.split(" ");
        result.overNum = overNumSplit[overNumSplit.length - 1];
    } catch (error) {
        result.error = true;
        console.log(error);
    }
    try {
        result.score = await page.$eval(".end-of-over .score", (el) => el.innerHTML);
    } catch (error) {
        result.error = true;
        console.log(error);
    }
    try {
        result.crr = await page.$eval(".rr.current-rr b", (el) => el.innerHTML);
    } catch (error) {
        result.error = true;
        console.log(error);
    }
    try {
        result.reqrr = await page.$eval(".rr.req-rr b", (el) => el.innerHTML);
    } catch (error) {
        result.error = true;
        console.log(error);
    }

    try {
        const battersData = await page.$$eval(".end-of-over .bat-score span", (elements) => elements.map((e) => e.textContent).slice(0, 4));
        let i = 1;
        let data = {};
        battersData.forEach((d) => {
            if (i % 2 === 0) {
                data.score = d;
                result.batters.push(data);
            } else {
                data = {};
                data.name = d.split(" ")[0];
            }
            i += 1;
        });
    } catch (error) {
        result.error = true;
        console.log(error);
    }

    try {
        const bowlersData = await page.$$eval(".end-of-over .bowl-score span", (elements) => elements.map((e) => e.textContent).slice(0, 2));
        let i = 1;
        let data = {};
        bowlersData.forEach((d) => {
            if (i % 2 === 0) {
                data.score = d;
                result.bowlers.push(data);
            } else {
                data = {};
                data.name = d.split(" ")[0];
            }
            i += 1;
        });
    } catch (error) {
        result.error = true;
        console.log(error);
    }
    try {
        result.currentBowler = await page.$$eval("table#table-propeller2 tbody .bowler-name-col", (elements) => elements.map((e) => e.textContent).slice(0, 1));
    } catch (error) {
        result.error = true;
        console.log(error);
    }

    try {
        result.recentBalls = await page.$$eval(".recent-over span", (elements) => {
            let balls = [];
            elements.forEach((e) => {
                if (e.innerHTML === "|") {
                    balls = [];
                } else if (e.innerHTML !== "") {
                    balls.push(e.innerHTML);
                }
            });

            return balls
                .filter((e) => e !== "lb" && e !== "wd" && e !== "b");
            // .slice(balls.length - 6);
        });
    } catch (error) {
        result.error = true;
        console.log(error);
    }

    try {
        result.isSecondInning = (await page.$eval(".summaryScoreData .req .team", (el) => el.innerHTML)).indexOf("require") > -1;
        const matchEndedStr = await page.$eval(".summaryScoreData .req .team", (el) => el.innerHTML);

        result.matchEndedStr = result.isSecondInning ? matchEndedStr.replace(result.team2Name, "").replace("require", "").trim() : matchEndedStr;
        result.matchEnded = result.matchEndedStr.indexOf("won") >= 0;
    } catch (error) {
        result.error = true;
        console.log(error);
    }

    // Closing the Puppeteer controlled headless browser
    await browser.close();

    res.json(result);
});

const port = process.env.PORT || 3333;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

module.exports = app;
