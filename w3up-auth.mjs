import { create } from '@web3-storage/w3up-client';

async function setup() {
  const email = 'jinwoo5385@naver.com';
  const spaceName = 'SolanaTokenGeneratorSpace';

  try {
    console.log('Initializing w3up client...');
    const client = await create();
    
    console.log(`1. Authorizing agent for ${email}...`);
    await client.authorize(email);
    console.log(`   ✅ Agent authorized. Please ensure your email is verified.`);

    console.log(`\n2. Checking for existing account...`);
    // This is the key difference: we get the account object first.
    const account = client.accounts().find(a => a.name === email);
    if (!account) {
      throw new Error(`Could not find an account for ${email}. Please ensure you have verified your email.`);
    }
    console.log(`   ✅ Found account: ${account.did()}`);

    console.log(`\n3. Creating a new Space named '${spaceName}'...`);
    const space = await client.createSpace(spaceName);
    console.log(`   ✅ New Space created with DID: ${space.did()}`);
    
    console.log(`\n4. Provisioning the new space with your account...`);
    // This command links the space to your account, giving the agent the proof it needs.
    await account.provision(space.did());
    await space.save(); // Save the space to the local store
    
    console.log(`\n5. Setting the new Space as current...`);
    await client.setCurrentSpace(space.did());
    
    console.log(`\n\n✅✅✅ SETUP COMPLETE! ✅✅✅`);
    console.log(`Your application is now fully configured to upload files to space: ${space.did()}`);

  } catch (error) {
    console.error('\n❌ SETUP FAILED:', error);
  }
}

setup();