import fs from "fs-extra";
import inquirer from "inquirer";

async function readCredentials() {
  let credentialsJson;
  try {
    credentialsJson = await fs.readFile('credentials.json', 'utf8');
  } catch (err) {
    // File doesn't exist, move on
    return null;
  }
  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (err) {
    throw new Error(`credentials.json found but not in valid JSON format`);
  }
  if (credentials.username && credentials.password) {
    return credentials;
  } else {
    throw new Error(`credentials.json found but doesn't contain both username and password values`);
  }
}

async function writeCredentials(credentials) {
  await fs.writeFile('credentials.json', JSON.stringify(credentials, null, '\t'), 'utf8');
}

function confirmCredentials(akun, credentials) {
  return akun.login(credentials.username, credentials.password);
}

export async function readOrAskForCredentials(akun, logger) {
  let credentials = await readCredentials().catch((e) => {
    logger.error(e);
    return null;
  });
  const storedCredentialsFound = !!credentials;
  if (!storedCredentialsFound) {
    console.log('No stored credentials available, please input account details (recommended to use a new dummy account)');
    credentials = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Username:'
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:'
      }
    ]);
  }
  await confirmCredentials(akun, credentials).then(
    (res) => {
      logger.log(`Logged in as ${res['username']}!`);
    },
    (err) => {
      throw new Error(`Unable to login: ${err}`);
    }
  );
  if (!storedCredentialsFound) {
    const {saveCredentials} = await inquirer.prompt({
      type: 'confirm',
      name: 'saveCredentials',
      message: 'Store credentials for next time? (Warning: will be stored in plaintext)'
    });
    if (saveCredentials) {
      await writeCredentials(credentials);
    }
  }
  return credentials;
}
