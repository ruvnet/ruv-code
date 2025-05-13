import { testPluginScaffolding } from "./testPluginScaffolding";

// Run the test function
testPluginScaffolding()
  .then(() => console.log("Test script completed"))
  .catch(error => console.error("Error running test script:", error));