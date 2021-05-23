#!/usr/bin/env node
const puppeteer = require('puppeteer');
const { program } = require('commander');
const inquirer = require('inquirer');
const log = require('loglevel');
const prefixer = require('loglevel-plugin-prefix');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { homedir } = require('os');
const { exit } = require('process');
const { version: packageVersion } = require('../package.json');
const extensions = require('./extensions.js');

let DEBUG_FLAG = false;
const CODEWARS_BASE_URL = 'https://www.codewars.com';
const DEFAULT_OUTPUT_DIR_PATH = path.join(homedir(), 'my_codewars_solutions');

prefixer.reg(log);
prefixer.apply(log);

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
    let extension = extensions[language] || '.txt';
    return index === 0 ? `solution.${extension}` : `solution_${index + 1}.${extension}`;
}

async function main() {
    program
        .version(packageVersion)
        .name('codewars-solutions-scraper')
        .option('-c, --codewars', 'use CodeWars login credentials')
        .option('-g, --github', 'use GitHub login credentials')
        .option('-o, --output <path>', 'path to the output directory where solutions will be saved', DEFAULT_OUTPUT_DIR_PATH)
        .option('-v, --verbose', 'explain what is being done')
        .option('-d, --debug', 'run the scraper in debug mode (will make browser window appear to see what is being done)')
        .requiredOption('-u, --username <username>', 'your CodeWars username')
        .requiredOption('-e, --email <email>', 'your GitHub or CodeWars account email')
        .requiredOption('-p, --password <password>', 'your GitHub or CodeWars account password')
        .parse(process.argv);

    if (!program.codewars && !program.github) {
        console.error(chalk.redBright('You must provide a type of authentication!'));
        console.info(chalk.blueBright('Use --help to read about auth options'));
        exit(1);
    } else if (program.codewars && program.github) {
        console.error(chalk.redBright('You cannot provide both types of authentication!'));
        console.info(chalk.blueBright('Only provide one type of authentication and run the command again'));
        exit(1);
    }

    log.setDefaultLevel('SILENT');
    if (program.verbose) log.setLevel('INFO');
    if (program.debug) DEBUG_FLAG = true;

    log.info('Launching Puppeteer instance.');
    const browser = await puppeteer.launch({
        headless: !DEBUG_FLAG
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(`${CODEWARS_BASE_URL}/users/sign_in`, { waitUntil: 'domcontentloaded' });
    if (program.codewars) { // Log in using Codewars credentials
        log.info('Attempting to log in using Codewars credentials.');
        await page.type('#user_email', program.email);
        await page.type('#user_password', program.password);
        await page.click('#new_user > button');
    }
    else if (program.github) { // Login using GitHub credentials
        log.info('Attempting to log in using GitHub credentials.');
        await page.click('button[data-action="auth#githubSignIn"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

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
    log.info('Login successful.');
    log.info(`Navigating to ${CODEWARS_BASE_URL}/users/${program.username}/completed_solutions.`);

    await page.goto(`${CODEWARS_BASE_URL}/users/${program.username}/completed_solutions`, { waitUntil: 'domcontentloaded' });
    log.info('Loading all solutions.');
    await autoScroll(page);

    // Until this point we have loaded all of our solutions
    // Now we get all solutions for each kata we have solved
    log.info('Scraping solutions.');
    const solutions = await page.evaluate(() => {
        return [...document.querySelectorAll('.list-item-solutions')].map(solution => {
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

    log.info(`Successfully scraped ${solutions.length} solutions.`);
    log.info('Closing Puppeteer instance.');
    await browser.close();

    log.info(`Saving all solutions to ${program.output}.`);
    fs.mkdirSync(path.join(program.output), { recursive: true });
    for (const solution of solutions) {
        if (!fs.existsSync(path.join(program.output, solution.problemName))) {
            fs.mkdirSync(path.join(program.output, solution.problemName));
            for (let i = 0; i < solution.codeSolutions.length; i++) {
                fs.writeFileSync(
                    path.join(program.output, solution.problemName, generateFilename(i, solution.languages[i])),
                    solution.codeSolutions[i]
                );
            }
        }
    }
    log.info('DONE.');
}

main();
