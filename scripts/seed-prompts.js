const admin = require('firebase-admin');

// IMPORTANT: Path to your service account key file.
// Make sure this file is in your project's root directory and listed in .gitignore
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Add your databaseURL if it's not automatically discovered
  // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com" 
});

// Explicitly connect to the 'a001' database instance
const db = admin.firestore();
console.log("Successfully connected to Firebase Admin SDK.");

// --- Data to Seed ---
const promptsToCreate = [
  {
    id: 'generateUserProfilePrompt',
    name: '用户画像生成',
    description: '根据用户的文本和图片输入，生成结构化的用户画像总结和标签。',
    scope: 'AI购物助手',
    status: '生效中',
    content: `You are an expert at analyzing user descriptions and images to create a concise user profile.
Based on the following information, generate a user profile summary and a list of relevant tags.
User Description: {{{description}}}
{{#if photoDataUri}}User Photo: {{media url=photoDataUri}}{{/if}}
Your response must be a JSON object that conforms to the output schema. The summary should be a single, insightful sentence. The tags should be a list of 3-5 keywords that capture the essence of the user's request and style.`
  },
  {
    id: 'getProductRecommendationsPrompt',
    name: '产品服务推荐',
    description: '基于用户画像，从产品和服务列表中进行智能匹配和推荐。',
    scope: 'AI购物助手',
    status: '生效中',
    content: `You are an expert shopping assistant. Your goal is to recommend the best products from a provided list based on the user's profile, also considering the quality and reputation of the supplier.
User Profile:
- Summary: {{{userProfile.summary}}}
- Tags: {{#each userProfile.tags}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Available Products (JSON format): {{{json products}}}
Available Suppliers (JSON format): {{{json suppliers}}}
{{#if photoDataUri}}The user also provided this photo for context: {{media url=photoDataUri}}{{/if}}
Based on all the information, analyze the product list and select the 3 to 5 products that best match the user's profile and query. When making recommendations, consider the product's attributes and its supplier's category and reputation (indicated by matchScore). Prefer products from more reputable suppliers.
Return only the IDs of the recommended products.`
  },
  {
    id: 'demandMatchingPrompt',
    name: '需求智能匹配',
    description: '为公开的需求，从创意方（产品/供应商）库中寻找最佳匹配。',
    scope: '需求池',
    status: '生效中',
    content: `You are an AI sourcing expert. Your task is to analyze a user's demand and recommend the most suitable "creatives" (which can be products, services, or suppliers) from a provided list.
The Demand:
- Title: {{{demand.title}}}
- Description: {{{demand.description}}}
- Category: {{{demand.category}}}
- Budget: {{{demand.budget}}}
Available Creatives (JSON format): {{{json creatives}}}
Analyze the demand and the list of creatives. Identify the top 3 creatives that are the best match for this demand. For each recommendation, provide a concise reason explaining why it's a good fit. Return an array of objects, each containing a 'creativeId' and a 'reason'.`
  },
  {
    id: 'supplierDataAnalysisPrompt',
    name: '供应商数据分析',
    description: '解析上传的CSV数据，评估供应商资质与平台的匹配度。',
    scope: '供应商中心',
    status: '草稿',
    content: `You are a supply chain analyst. You are given a CSV data file containing information about potential suppliers. Your task is to process this data, evaluate each supplier's potential fit for our platform, and return a structured JSON array.
For each supplier, assess their category, product line, and description to generate a 'matchScore' (0-100) and a brief 'recommendation' text.
The CSV data is provided as a data URI.
CSV Data: {{{csvDataUri}}}
Return a JSON array of objects, where each object represents a processed supplier and contains the fields: 'name', 'category', 'matchScore', and 'recommendation'.`
  }
];

// --- Seeding Logic ---
const seedPrompts = async () => {
  const promptsCollection = db.collection('prompts');
  console.log('Starting to seed prompts...');

  const batch = db.batch();

  for (const promptData of promptsToCreate) {
    // Use the custom ID for the document reference
    const docRef = promptsCollection.doc(promptData.id);
    batch.set(docRef, promptData);
  }

  try {
    await batch.commit();
    console.log(`Successfully seeded ${promptsToCreate.length} prompts into the 'prompts' collection.`);
  } catch (error) {
    console.error('Error seeding prompts:', error);
  }
};

seedPrompts();
