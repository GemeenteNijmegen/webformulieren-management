import { EncryptFilename } from '../encryptFilename';

describe('EncryptFilename', ()=> {
  test('should demonstrate the use of the functions', () => {

    const key = EncryptFilename.generateKey();
    const fileName = 'FormOverview-1723242475728-aanmeldenSportactiviteit.csv';
    const encryptedFilename = EncryptFilename.encrypt(key, fileName);
    const decryptedFilename = EncryptFilename.decrypt(key, encryptedFilename);
    console.log(`[EncryptFileNameTest] key ${key}, save the key in the session of the user and retrieve when decrypting. \n
        encryptedfilename: ${encryptedFilename}. decryptedfilename: ${decryptedFilename}.`);
    expect(decryptedFilename).toEqual(fileName);
  });
});