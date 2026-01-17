import { database } from './src/database.js';

async function clearAssessments() {
  try {
    console.log('Connecting to database...');
    await database.connect();
    
    const collection = database.getCollection();
    
    console.log('Deleting all assessment documents...');
    const result = await collection.deleteMany({ type: 'gp_consultation_assessment' });
    
    console.log(`✓ Deleted ${result.deletedCount} assessment documents`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing assessments:', error);
    process.exit(1);
  }
}

clearAssessments();
