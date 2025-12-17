import { OpenAIEmbeddings } from "@langchain/openai";


const calculateMissingFields=(params)=> {
    const missing = [];
    if (!params.geographyType) missing.push("geography type (central/state)");
    if ((params.geographyType === 'state' && !params.state) || (params.geographyType === 'both' && !params.state)) {
      missing.push("state name");
    }
    if (!params.actKeywords?.length && !params.complianceKeywords?.length) missing.push("act/compliance keywords");
    return missing;
  }



  const createEmbeddingsFromText=async(text)=>{

    try{

      const embeddings=new OpenAIEmbeddings({
        apiKey:process.env.OPENAI_API_KEY,
        model:"text-embedding-3-large",
        dimensions: 1024,
      });
      console.log(`here = ${embeddings}`)

      const embeddingVector=await embeddings.embedQuery(text);

      return embeddingVector;

      
    }catch(err){

      console.error("An error occured while creating embeddings : ",err);

      return false;
    }
  }



const formatDataForPrompt=(data)=>{

  let text=``;

  data && data.forEach((obj)=>{

    Object.keys(obj).forEach((key)=>{

      const value=obj[key];

      if(value && value.length){
        text+=`${key.replace("_"," ")} : ${value.replaceAll("\n",";")}\n`
      }
      
    });

    text+='\n\n';
  });

  return text;
}
  
  
 
  
export { calculateMissingFields,createEmbeddingsFromText, formatDataForPrompt };