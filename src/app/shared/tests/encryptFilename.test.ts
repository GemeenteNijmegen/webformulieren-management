import { EncryptFilename } from '../encryptFilename';

describe('EncryptFilename', ()=> {
  test('should demonstrate the use of the functions', async () => {

    const key = EncryptFilename.generateKey();
    const fileName = 'FormOverview-1723242475728-aanmeldenSportactiviteit.csv';
    const encryptedFilename = await EncryptFilename.encrypt(key, fileName);
    const decryptedFilename = await EncryptFilename.decrypt(key, encryptedFilename);
    console.log(`[EncryptFileNameTest] key ${key}, save the key in the session of the user and retrieve when decrypting. \n
        encryptedfilename: ${encryptedFilename}. decryptedfilename: ${decryptedFilename}.`);
    expect(decryptedFilename).toEqual(fileName);
  });
  test('should test with failing case', async () => {

    const key = 'ab3a40df52563b7a25b03fbbe6b7764c';
    const fileName = ' 	FormOverview-1723382636896-aanmeldenSportactiviteit.csv';
    const encryptedFilename = await EncryptFilename.encrypt(key, fileName);
    const decryptedFilename = await EncryptFilename.decrypt(key, encryptedFilename);
    console.log(`[EncryptFileNameTest] key ${key}, save the key in the session of the user and retrieve when decrypting. \n
        encryptedfilename: ${encryptedFilename}. decryptedfilename: ${decryptedFilename}.`);
    expect(decryptedFilename).toEqual(fileName);
  });
  test('should decrypt a specific case', async () => {

    const key = 'c9496aa6035cb8d999cbc68e8d38d14c';
    const fileName = 'FormOverview-1723390473936-aanmeldenSportactiviteit.csv';
    const encryptedFilename = 'V3K78CSYcR6RmTnX6kqVSwsQq9uvU17fGPMagAgOe6QVcLsfv/LJnTuXIL892QWwSrM9pFCKT18f+cP2In7twQ==';
    const decryptedFilename = await EncryptFilename.decrypt(key, encryptedFilename);
    console.log(`[EncryptFileNameTest] key ${key}, save the key in the session of the user and retrieve when decrypting. \n
        encryptedfilename: ${encryptedFilename}. decryptedfilename: ${decryptedFilename}.`);
    expect(decryptedFilename).toEqual(fileName);
  });
});