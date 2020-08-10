# Codewars Solutions Scraper

A command line tool that scrapes the solutions of all the CodeWars katas you have solved.

## Installation

To install the tool simply run the following command in a terminal:

```sh
npm install -g codewars-solutions-scraper
```

And the command `codewars-solutions-scraper` will be installed globally in your system and ready to use.

## Usage

```sh
Usage: codewars-solutions-scraper [-c, --codewars | -g, --github] -u, --username <username> -e, --email <email> -p, --password <password>

Options:
  -V, --version              output the version number
  -c, --codewars             use CodeWars login credentials
  -g, --github               use GitHub login credentials
  -u, --username <username>  your CodeWars username
  -e, --email <email>        your GitHub or CodeWars account email
  -p, --password <password>  your GitHub or CodeWars account password
  -h, --help                 display help for command
```

* NOTE: `-c` and `-g` options are mutually exclusive.

## Examples

### Logging in using GitHub

If you want to login to CodeWars using your GitHub credentials then run:

```sh
codewars-solutions-scraper -g -u <YOUR_CODEWARS_USERNAME> -e <YOUR_GITHUB_EMAIL> -p <YOUR_GITHUB_PASSWORD>
```

Note that if you login via GitHub, you will be prompted to enter a verification code sent to your GitHub account email.
The prompt will look like this: 

`Please enter the verification code that was sent to <YOUR_GITHUB_EMAIL>:`

When you receive the verification code, just type it in and press Enter.

### Logging in using CodeWars

If you want to login to CodeWars using your CodeWars credentials then run:

```sh
codewars-solutions-scraper -c -u <YOUR_CODEWARS_USERNAME> -e <YOUR_CODEWARS_EMAIL> -p <YOUR_CODEWARS_PASSWORD>
```

## Built With

* [Puppeteer](https://pptr.dev)
* [Commander](https://www.npmjs.com/package/commander)
* [Inquirer](https://www.npmjs.com/package/inquirer)
* [Chalk](https://www.npmjs.com/package/chalk)

## License

[GPL-3.0 License](https://choosealicense.com/licenses/gpl-3.0/)