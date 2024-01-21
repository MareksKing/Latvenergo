const express = require("express");
const axios = require("axios");
const app = express();
const PORT = 8080;

app.use(express.json());

app.get("/", async (req, res, next) => {
  try {
      const { query, page } = req.body;
  
      if (!query) {
        return res.status(400).json({ error: 'Missing query parameter.' });
      }
  
      const pageNumber = parseInt(page) || 1;
      const pageSize = 2;
      
      const apiUrl = `https://dummyjson.com/products/search?q=${query}&limit=${pageSize}&skip=0`;
  
      const response = await axios.get(apiUrl);
      const data = response.data;

      // Return the transformed data
      const convertedData = returnSpecificJsonData(data)
      res.send(convertedData);
  
    } catch (error) {
      // Pass the error to the error-handling middleware
      next(error);
    }
});

function returnSpecificJsonData(json_data){
var products = json_data.products; 
var specificProductData = [];
for (let i = 0; i < json_data.products.length; i++) {
  const element = products[i];
  specificProductData.push({
    title: element.title,
    description: element.description,
    final_price: element.price - (element.price * element.discountPercentage / 100)
  })
  
}
console.log(specificProductData);
var jsonProductData = JSON.stringify(specificProductData);
return jsonProductData;
}

app.listen(PORT, () => console.log(`running on http://localhost:${PORT}`));
