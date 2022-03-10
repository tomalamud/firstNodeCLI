import fs from "fs";
import ncp from "ncp";
import path from "path";
import { promisify } from "util";
import Listr from "listr";
import { projectInstall } from "pkg-install";
import execa from 'execa';

const access = promisify(fs.access);
const copy = promisify(ncp);

async function copyTemplateFiles(options) {
  return copy(options.templateDirectory, options.targetDirectory, {
    clobber: false,
  });
}

async function initGit(options) {
  const result = await execa('git', ['init'], {
    cwd: options.targetDirectory,
  });
  if (result.failed) {
    return Promise.reject(new Error('Failed to initialize git'));
  };
  return;
}

const tasks = new Listr([
  {
    title: 'Copy project files',
    task: () => copyTemplateFiles(options),
  },
  {
    title: 'Initialize git',
    task: () => initGit(options),
    enabled: () => options.git,
  },
  {
    title: 'Install project dependencies',
    task: () => projectInstall({
      cwd: options.targetDirectory,
    }),
    skip: () => !options.runInstall ? 'Pass install to automatically install the packages' : undefined,
  }
]);

export async function createProject(options) {
  options = {
    ...options,
    targetDirectory: options.targetDirectory || process.cwd(),
  }

  const currentFileUrl = import.meta.url;
  const templateDir = path.resolve(
    new URL(currentFileUrl).pathname,
    '../../templates',
    options.template.toLowerCase()
  );
  options.templateDirectory = templateDir;

  try {
    await access(templateDir, fs.constants.R_OK);
  } catch (err) {
    console.error('Invalid Template name');
    process.exit(1);
  }

  await tasks.run();

  console.log('Project ready');
  return true;
}