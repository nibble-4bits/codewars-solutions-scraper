const puppeteer = require('puppeteer');
const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');

const CODEWARS_BASE_URL = 'https://www.codewars.com';

async function autoScroll(page) {
    return await page.evaluate(() => {
        async function wait(ms) {
            return new Promise((resolve, reject) => {
                setTimeout(resolve, ms);
            });
        }

        return new Promise(async (resolve, reject) => {
            let currentScrollHeight = 0;
            while (currentScrollHeight < document.body.scrollHeight) {
                currentScrollHeight = document.body.scrollHeight;
                window.scroll(0, document.body.scrollHeight);
                await wait(1500);
            }
            resolve();
        });
    });
}

async function main() {
    program
        .version('1.0.0')
        .name('codewars-solutions-scraper')
        .usage('[-c | --codewars] [-g | --github] -u, --username <username> -e, --email <email> -p, --password <password>')
        .option('-c, --codewars', 'use CodeWars login credentials')
        .option('-g, --github', 'use GitHub login credentials')
        .requiredOption('-u, --username <username>', 'your CodeWars username')
        .requiredOption('-e, --email <email>', 'your GitHub or CodeWars account email')
        .requiredOption('-p, --password <password>', 'your GitHub or CodeWars account password')
        .parse(process.argv);

    if (!program.codewars && !program.github) {
        console.error(chalk.redBright('You must provide a type of authentication!'));
        console.info(chalk.blueBright('Use --help to read about auth options'));
        return;
    }

    const browser = await puppeteer.launch({
        headless: false,
        timeout: 50000
    });

    const page = await browser.newPage();

    if (program.codewars) {
        // TODO: handle this case
        // await page.goto(`${CODEWARS_BASE_URL}/users/sign_in`)
    }
    else if (program.github) {
        await page.goto(`${CODEWARS_BASE_URL}/users/preauth/github/signin`, { waitUntil: 'domcontentloaded' });

        await page.type('#login_field', program.email);
        await page.type('#password', program.password);
        await page.click('#login input[type="submit"]');

        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        if (page.url() === 'https://github.com/sessions/verified-device') {
            const answer = await inquirer
                .prompt([
                    { type: 'input', name: 'verificationCode', message: `Please enter the verification code that was sent to ${program.email}:` }
                ]);

            await page.type('#otp', answer.verificationCode);
            await page.click('#login button');
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
        }
    }

    await page.goto(`${CODEWARS_BASE_URL}/users/${program.username}/completed_solutions`, { waitUntil: 'domcontentloaded' });
    await autoScroll(page);

    // Until this point we have loaded all of our solutions

    await browser.close();
}

main();