require("dotenv").config();
const { s3, BUCKET_NAME } = require("./aws-config");

async function testS3Connection() {
  try {
    console.log("Testing S3 connection...");
    
    // Test 1: List buckets
    console.log("\nTest 1: Listing buckets...");
    const buckets = await s3.listBuckets().promise();
    console.log("✅ Successfully listed buckets:", buckets.Buckets.map(b => b.Name));

    // Test 2: Upload a test file
    console.log("\nTest 2: Uploading test file...");
    const testKey = "test/test-file.txt";
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: "Hello from Triple Clef!",
      ContentType: "text/plain"
    }).promise();
    console.log("✅ Successfully uploaded test file");

    // Test 3: Read the test file
    console.log("\nTest 3: Reading test file...");
    const data = await s3.getObject({
      Bucket: BUCKET_NAME,
      Key: testKey
    }).promise();
    console.log("✅ Successfully read file content:", data.Body.toString());

    // Test 4: Delete the test file
    console.log("\nTest 4: Deleting test file...");
    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: testKey
    }).promise();
    console.log("✅ Successfully deleted test file");

    console.log("\n🎉 All S3 tests passed! Your S3 configuration is working correctly.");
  } catch (error) {
    console.error("\n❌ S3 test failed:", error.message);
    if (error.code === "InvalidAccessKeyId") {
      console.error("The AWS Access Key ID you provided is invalid");
    } else if (error.code === "SignatureDoesNotMatch") {
      console.error("The AWS Secret Access Key you provided is invalid");
    } else if (error.code === "NoSuchBucket") {
      console.error(`The bucket "${BUCKET_NAME}" does not exist`);
    }
  }
}

testS3Connection();
