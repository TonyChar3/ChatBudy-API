/**
 * Function to verify the sent shopify store domain
 */
const verifyShopifyDomain = (domain) => {
    // check if the domain follow the .myshopify.com format
    const domain_regex = /^(https?:\/\/)?([a-zA-Z0-9][a-zA-Z0-9-]*\.)?myshopify\.com$/;
    if(domain_regex.test(domain)){
        return domain
    }
    return false
}

export { verifyShopifyDomain }