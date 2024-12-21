import bodyParser from "body-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import logger from "morgan";
import path from "path";
// import puppeteerExtra from "puppeteer-extra";
// import stealth from "puppeteer-extra-plugin-stealth";
import { connect } from "puppeteer-real-browser";
import { setTimeout } from "timers/promises";

// puppeteerExtra.use(stealth());

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
    // const browser = await puppeteerExtra.launch({ headless: "new" });
    // console.log("puppeteer launched...");
    // const page = await browser.newPage();

    // await page.setViewport({width: 1920, height: 1080});
    // await page.setUserAgent(
    //     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36",
    // );
    console.log("url: " + req.query.u);
    // await page.goto(req.query.u);
    // await page.waitForNetworkIdle();
    // console.log("puppeteer page fetched...");

    // Taking a screenshot of the page and saving it
    // await page.screenshot({ path: "digimon-website.png", fullPage: true });

    const { page, browser } = await connect({
        headless: false,
        args: [],
        customConfig: {},
        turnstile: true,
        connectOption: {},
        disableXvfb: false,
        ignoreAllFlags: false,
    });
    await page.goto(req.query.u, { waitUntil: "domcontentloaded" });
    console.log("puppeteer page fetched...2");

    const result = {
        team1Name: "Team 1",
        team2Name: "Team 2",
        overNum: "0.0",
        score: "0/0",
        crr: "0.00",
        reqrr: "0.00",
        batters: [],
        bowlers: [{ name: "NA", score: 0 }],
        recentBalls: [],
        currentBowler: "",
        isSecondInning: false,
        matchEnded: "",
        matchEndedStr: "",
        error: false,
    };

    await setTimeout(10000);

    try {
        const pageData = await page.$$eval("script", (scripts) => JSON.parse(
            scripts
                .map((src) => src.innerHTML)
                .filter((el) => el.includes("\"scorecard\""))[0] // selecting the desired <script>
                .trim(),
        ));
        console.log(JSON.stringify(pageData.props.pageProps));
        const miniScorecard = pageData.props.pageProps.miniScorecard;
        if (miniScorecard.status) {
            result.team1Name = miniScorecard.data.team_a.name;
            result.team2Name = miniScorecard.data.team_b.name;

            if (miniScorecard.data.team_b.innings[0].inning_start_time) {
                result.overNum = miniScorecard.data.team_b.innings[0].overs_played;
                result.score = miniScorecard.data.team_b.innings[0].summary.score;
                result.crr = miniScorecard.data.team_b.innings[0].summary.rr;

                result.reqrr = miniScorecard.data.match_summary.rrr;
                result.matchEndedStr = "need" + miniScorecard.data.match_summary.ticker_summary.split("require")[1];
                result.isSecondInning = true;
            } else {
                result.overNum = miniScorecard.data.team_a.innings[0].overs_played;
                result.score = miniScorecard.data.team_a.innings[0].summary.score;
                result.crr = miniScorecard.data.team_a.innings[0].summary.rr;
            }
            const strikeBowler = miniScorecard.data.bowlers.sb;
            result.bowlers = [];
            result.bowlers.push({
                name: strikeBowler.name,
                score: `${strikeBowler.overs}-${strikeBowler.maidens}-${strikeBowler.runs}-${strikeBowler.wickets}`,
            });

            const strikeBatsmen = miniScorecard.data.batsmen.sb;
            const nonstrikeBatsmen = miniScorecard.data.batsmen.nsb;
            result.batters = [];
            result.batters.push({
                name: "*" + strikeBatsmen.name,
                score: `${strikeBatsmen.runs}(${strikeBatsmen.balls})`,
            });
            result.batters.push({
                name: nonstrikeBatsmen.name,
                score: `${nonstrikeBatsmen.runs}(${nonstrikeBatsmen.balls})`,
            });

            if (miniScorecard.data.recent_over.includes("|")) {
                const splitByover = miniScorecard.data.recent_over.trim().split(" | ");
                result.recentBalls = splitByover[splitByover.length - 1].trim().split(" ");
            } else {
                result.recentBalls = miniScorecard.data.recent_over.trim().split(" ");
            }
        } else if (pageData.props.pageProps.summaryData.status) {
            result.team1Name = pageData.props.pageProps.summaryData.data.team_a.name;
            result.team2Name = pageData.props.pageProps.summaryData.data.team_b.name;
            result.matchEnded = true;
            result.matchEndedStr = pageData.props.pageProps.summaryData.data.match_summary.summary;
        }
    } catch (error) {
        result.error = true;
        console.log(error);
    }

    // try {
    //     const overNum = await page.$eval(".end-of-over .end-title.text-uppercase", (el) => el.innerHTML);
    //     const overNumSplit = overNum.split(" ");
    //     result.overNum = overNumSplit[overNumSplit.length - 1];
    // } catch (error) {
    //     result.error = true;
    //     console.log(error);
    // }
    // try {
    //     result.score = await page.$eval(".end-of-over .score", (el) => el.innerHTML);
    // } catch (error) {
    //     result.error = true;
    //     console.log(error);
    // }
    // try {
    //     result.crr = await page.$eval(".rr.current-rr b", (el) => el.innerHTML);
    // } catch (error) {
    //     result.error = true;
    //     console.log(error);
    // }
    // try {
    //     result.reqrr = await page.$eval(".rr.req-rr b", (el) => el.innerHTML);
    // } catch (error) {
    //     result.error = true;
    //     console.log(error);
    // }

    // try {
    //     const battersData = await page.$$eval(".end-of-over .bat-score span", (elements) => elements.map((e) => e.textContent).slice(0, 4));
    //     let i = 1;
    //     let data = {};
    //     battersData.forEach((d) => {
    //         if (i % 2 === 0) {
    //             data.score = d;
    //             result.batters.push(data);
    //         } else {
    //             data = {};
    //             data.name = d.split(" ")[0];
    //         }
    //         i += 1;
    //     });
    // } catch (error) {
    //     result.error = true;
    //     console.log(error);
    // }

    // try {
    //     const bowlersData = await page.$$eval(".end-of-over .bowl-score span", (elements) => elements.map((e) => e.textContent).slice(0, 2));
    //     let i = 1;
    //     let data = {};
    //     bowlersData.forEach((d) => {
    //         if (i % 2 === 0) {
    //             data.score = d;
    //             result.bowlers.push(data);
    //         } else {
    //             data = {};
    //             data.name = d.split(" ")[0];
    //         }
    //         i += 1;
    //     });
    // } catch (error) {
    //     result.error = true;
    //     console.log(error);
    // }
    // try {
    //     result.currentBowler = await page.$$eval("table#table-propeller2 tbody .bowler-name-col", (elements) => elements.map((e) => e.textContent).slice(0, 1));
    // } catch (error) {
    //     result.error = true;
    //     console.log(error);
    // }

    // try {
    //     result.recentBalls = await page.$$eval(".recent-over span", (elements) => {
    //         let balls = [];
    //         elements.forEach((e) => {
    //             if (e.innerHTML === "|") {
    //                 balls = [];
    //             } else if (e.innerHTML !== "") {
    //                 balls.push(e.innerHTML);
    //             }
    //         });

    //         return balls
    //             .filter((e) => e !== "lb" && e !== "wd" && e !== "b");
    //         // .slice(balls.length - 6);
    //     });
    // } catch (error) {
    //     result.error = true;
    //     console.log(error);
    // }

    // try {
    //     result.isSecondInning = (await page.$eval(".summaryScoreData .req .team", (el) => el.innerHTML)).indexOf("require") > -1;
    //     const matchEndedStr = await page.$eval(".summaryScoreData .req .team", (el) => el.innerHTML);

    //     result.matchEndedStr = result.isSecondInning ? matchEndedStr.replace(result.team2Name, "").replace("require", "").trim() : matchEndedStr;
    //     result.matchEnded = result.matchEndedStr.indexOf("won") >= 0;
    // } catch (error) {
    //     result.error = true;
    //     console.log(error);
    // }

    // Closing the Puppeteer controlled headless browser
    await browser.close();

    res.json(result);
});

const port = process.env.PORT || 3333;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

module.exports = app;
