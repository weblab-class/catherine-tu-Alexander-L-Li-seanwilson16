const axios = require('axios');

async function checkJobStatus() {
  const jobId = 'cm6gy063c03oc0joi0zr33s5t'; // other stem job ID
  
  try {
    const config = {
      method: 'get',
      url: `https://groovy.audioshake.ai/job/${jobId}`,
      headers: { 
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
      }
    };

    const response = await axios.request(config);
    // console.log("Job Status:", JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log("Error:", error.message);
    if (error.response) {
      // console.log("Response data:", error.response.data);
    }
  }
}

checkJobStatus();
