const puppeteer = require('puppeteer');
const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { exit } = require('process');

const CODEWARS_BASE_URL = 'https://www.codewars.com';
const OUTPUT_DIR_NAME = 'my_solutions';

async function autoScroll(page) {
    return await page.evaluate(() => {
        async function sleep(ms) {
            return new Promise((resolve, reject) => {
                setTimeout(resolve, ms);
            });
        }

        return new Promise(async (resolve, reject) => {
            let currentScrollHeight = 0;
            while (currentScrollHeight < document.body.scrollHeight) {
                currentScrollHeight = document.body.scrollHeight;
                window.scroll(0, document.body.scrollHeight);
                await sleep(1500);
            }
            resolve();
        });
    });
}

function generateFilename(index, language) {
    let extension;
    switch (language) {
        case 'c':
            extension = 'c';
            break;
        case 'cpp':
            extension = 'cpp';
            break;
        case 'csharp':
            extension = 'cs';
            break;
        case 'java':
            extension = 'java';
            break;
        case 'javascript':
            extension = 'js';
            break;
        case 'python':
            extension = 'py';
            break;
        case 'shell':
            extension = 'sh';
            break;
        case 'typescript':
            extension = 'ts';
            break;
        default:
            extension = 'txt';
            break;
    }
    return index === 0 ? `solution.${extension}` : `solution_${index + 1}.${extension}`;
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
        exit(1);
    }

    const browser = await puppeteer.launch({
        headless: false
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    if (program.codewars) { // Log in using Codewars credentials
        await page.goto(`${CODEWARS_BASE_URL}/users/sign_in`)

        await page.type('#user_email', program.email);
        await page.type('#user_password', program.password);
        await page.click('#new_user > button');
    }
    else if (program.github) { // Login using GitHub credentials
        await page.goto(`${CODEWARS_BASE_URL}/users/preauth/github/signin`, { waitUntil: 'domcontentloaded' });

        await page.type('#login_field', program.email);
        await page.type('#password', program.password);
        await page.click('#login input[type="submit"]');

        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        if (page.url() === 'https://github.com/sessions/verified-device') {
            const answer = await inquirer
                .prompt([
                    {
                        type: 'input',
                        name: 'verificationCode',
                        message: `Please enter the verification code that was sent to ${program.email}:`
                    }
                ]);

            await page.type('#otp', answer.verificationCode);
            await page.click('#login button');
            await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        }
    }

    await page.goto(`${CODEWARS_BASE_URL}/users/${program.username}/completed_solutions`, { waitUntil: 'domcontentloaded' });
    await autoScroll(page);

    // Until this point we have loaded all of our solutions
    // Now we get all solutions for each kata we have solved
    const solutions = await page.evaluate(() => {
        return [...document.querySelectorAll('.list-item.solutions')].map(solution => {
            const problemId = solution.querySelector('.item-title a').getAttribute('href').match(/[a-z0-9]+$/g)[0];
            const problemName = solution.querySelector('.item-title a').textContent.toLowerCase().replace(/[^\w ]/gi, '').trim().replace(/ +/g, '_');
            const languages = [...solution.querySelectorAll('code')].map(code => code.getAttribute('data-language'));
            const codeSolutions = [...solution.querySelectorAll('code')].map(code => code.textContent);

            return {
                problemId,
                problemName,
                languages,
                codeSolutions
            };
        });
    });

    await browser.close();

    fs.mkdirSync(path.join(__dirname, OUTPUT_DIR_NAME));
    for (const solution of solutions) {
        if (!fs.existsSync(path.join(__dirname, OUTPUT_DIR_NAME, solution.problemName))) {
            fs.mkdirSync(path.join(__dirname, OUTPUT_DIR_NAME, solution.problemName));
            for (let i = 0; i < solution.codeSolutions.length; i++) {
                fs.writeFileSync(
                    path.join(__dirname, OUTPUT_DIR_NAME, solution.problemName, generateFilename(i, solution.languages[i])),
                    solution.codeSolutions[i]
                );
            }
        }
    }
}

main();