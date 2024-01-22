const express = require("express");
const axios = require("axios");
const app = express();
const PORT = 8080;

app.use(express.json());

//Incoming log
app.use((req, res, next) => {
  setImmediate(() => {
    console.log({
      type: "messageIn",
      body: req.body,
      method: req.method,
      path: req.url.toString(),
      dateTime: new Date().toLocaleString()
    });
  });
  next();
});

//Outgoing log
app.use((req, res, next) => {
  res.on("finish", () =>{
    setImmediate(() => {
      console.log({
        type: "messageOut",
        //is res.locals best you can do in this case?
        body: res.locals.convertedData,
        dateTime: new Date().toLocaleString()
      });
    });
  });
  next();
});

app.get("/", async (req, res, next) => {
  try {
      const { query, page } = req.body;

      const validatedData = validateInputData(req.body)
      if(validatedData.code !== 200){
        res.status(validatedData.code).send(validatedData);
      }else{

        
        const pageNumber = parseInt(page) || 1;
        const pageSize = 2;
        
        const apiUrl = `https://dummyjson.com/products/search?q=${query}&limit=${pageSize}&skip=0`;
        
        const response = await axios.get(apiUrl);
        const data = response.data;
        
        // Return the transformed data
        const convertedData = returnSpecificJsonData(data)
        res.locals.convertedData = convertedData;
        res.json(convertedData);
      }
  
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
    var final_sum =  (element.price - (element.price * element.discountPercentage / 100)).toFixed(2);
    var final_price = parseFloat(final_sum);
    specificProductData.push({
      "Produkta nosaukums": element.title,
      "Produkta apraksts": element.description,
      "Produkta gala cena": final_price
    })
    
  }
  // console.log(specificProductData);
  var jsonProductData = JSON.parse(JSON.stringify(specificProductData));
  return jsonProductData;
}

function validateInputData(request_body){
  //TODO: Improve validation code, this is bad imo
  const { query, page } = request_body;
  if(!query && !page){
    return {code: 400, message:"Missing both parameters"};
  }
  if (!query){
    return {code: 400, message:"Missing query parameter"};
  }
  if (!page) {
    return {code: 400, message:"Missing page parameter"};
  }
  if (typeof query !== 'string') {
    return {code: 400, message:"Query parameter must be a string"};
  }
  if (!(query.length >= 1)) {
    return {code: 400, message:"Query parameter can't be empty"};
  }
  if (typeof page !== 'number') {
    return {code: 400, message:"Page parameter must be a number"};
  }
  if(!(parseInt(page) >= 1)){
    return {code: 400, message:"Page parameter must be positive number"};
  }
  return {code: 200}
}


app.listen(PORT, () => console.log(`running on http://localhost:${PORT}`));
