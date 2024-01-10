import * as fs from 'fs';

export class Files {

  /**
   * Check if the template is found in the file system
   * @param path to template should start with /opt/
   * @returns template as string or undefined
   */
  static getTemplateOverwrite(path: string) : undefined | string {
    if (fs.existsSync(path)) {
      console.info(`${path} template overwrite found!`);
      return fs.readFileSync(path).toString('utf8');
    }
    return undefined;
  }

  /**
   * Get the authentication JSON file and parse it
   * @returns the list of profiles
   */
  static getAuthenticationProfiles() : any {
    const profiles = JSON.parse(fs.readFileSync('/opt/authentication.json').toString('utf8'));
    console.info('Initializing authentication profiles', profiles);
    return profiles;
  }
}