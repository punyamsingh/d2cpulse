/**
 * Shopify Store Analyzer Utilities
 * Fetches and analyzes Shopify store data for competitive intelligence
 */

/**
 * Normalize Shopify store URL
 */
export function normalizeShopifyUrl(url) {
  let normalized = url.trim().toLowerCase();

  // Remove protocol
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    const urlObj = new URL(url);
    normalized = urlObj.hostname;
  }

  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, "");

  // Remove www. prefix
  if (normalized.startsWith("www.")) {
    normalized = normalized.substring(4);
  }

  return normalized;
}

/**
 * Fetch products with pagination and rate limiting
 */
export async function fetchProducts(storeUrl, maxProducts = null) {
  const normalized = normalizeShopifyUrl(storeUrl);
  const products = [];
  let page = 1;
  let consecutive429s = 0;
  const maxRetries = 3;

  while (true) {
    if (maxProducts && products.length >= maxProducts) break;

    try {
      const url = `https://${normalized}/products.json?limit=250&page=${page}`;
      console.log(`Fetching: ${url}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "D2CPulse/1.0 (Competitive Intelligence Bot)",
        },
        signal: AbortSignal.timeout(30000),
      });

      console.log(`Response status: ${response.status}`);

      if (response.status === 404) {
        // Try alternative formats
        if (!normalized.includes(".myshopify.com")) {
          return {
            success: false,
            error: `Store not found at ${storeUrl}. This may not be a Shopify store, or the URL might be incorrect. Try: ${normalized}.myshopify.com`,
          };
        }
        return { success: false, error: `Store not found: ${storeUrl}` };
      }

      if (response.status === 429) {
        consecutive429s++;
        if (consecutive429s > maxRetries) {
          return {
            success: false,
            error: "Rate limited too many times",
            products,
            partial: true,
          };
        }
        const waitTime = 2 ** consecutive429s;
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
        continue;
      }

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      consecutive429s = 0;
      const data = await response.json();
      const batch = data.products || [];

      if (batch.length === 0) break;

      products.push(...batch);
      console.log(
        `Fetched page ${page}: ${batch.length} products (total: ${products.length})`
      );

      if (batch.length < 250) break;

      page++;
      const adaptiveDelay = 500 + Math.floor(page / 5) * 200;
      await new Promise((resolve) => setTimeout(resolve, adaptiveDelay));
    } catch (error) {
      return {
        success: false,
        error: error.message,
        products,
        partial: true,
      };
    }
  }

  const finalProducts = maxProducts ? products.slice(0, maxProducts) : products;

  return {
    success: true,
    products: finalProducts,
    total_fetched: finalProducts.length,
    total_available: products.length,
    truncated: maxProducts && products.length > maxProducts,
  };
}

/**
 * Fetch collections
 */
export async function fetchCollections(storeUrl) {
  const normalized = normalizeShopifyUrl(storeUrl);

  try {
    const url = `https://${normalized}/collections.json`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "D2CPulse/1.0 (Competitive Intelligence Bot)",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return { success: false, collections: [] };
    }

    const data = await response.json();
    return { success: true, collections: data.collections || [] };
  } catch (error) {
    return { success: false, collections: [], error: error.message };
  }
}

/**
 * Calculate statistics from products
 */
function calculateStatistics(products, storeUrl) {
  const productData = [];
  const allTags = [];
  const vendors = [];

  for (const product of products) {
    const productInfo = {
      id: product.id,
      title: product.title || "",
      product_type: product.product_type || "Uncategorized",
      vendor: product.vendor || "Unknown",
      tags: product.tags || [],
      variants: [],
      images_count: (product.images || []).length,
      has_compare_at_price: false,
      created_at: product.created_at || "",
    };

    for (const variant of product.variants || []) {
      try {
        const priceValue = parseFloat(variant.price || 0);
        // Detect if price is already in INR (typically > 100) or USD (typically < 100)
        const isAlreadyInr = priceValue > 100 || storeUrl.includes(".in");
        const priceInr = isAlreadyInr ? priceValue : priceValue * 83;

        const compareAtPrice = variant.compare_at_price;
        const compareAtInr = compareAtPrice
          ? isAlreadyInr
            ? parseFloat(compareAtPrice)
            : parseFloat(compareAtPrice) * 83
          : null;

        if (compareAtInr && compareAtInr > priceInr) {
          productInfo.has_compare_at_price = true;
        }

        productInfo.variants.push({
          price: priceInr,
          compare_at_price: compareAtInr,
          available: variant.available !== false,
          sku: variant.sku || "",
          title: variant.title || "Default",
          currency: isAlreadyInr ? "INR" : "USD",
        });
      } catch (e) {
        // Skip invalid variants
      }
    }

    if (product.tags) allTags.push(...product.tags);
    if (product.vendor) vendors.push(product.vendor);

    productData.push(productInfo);
  }

  const prices = productData
    .flatMap((p) => p.variants.map((v) => v.price))
    .filter((p) => p > 0);
  const variantsCounts = productData
    .map((p) => p.variants.length)
    .filter((c) => c > 0);

  if (prices.length === 0 || productData.length === 0) {
    return null;
  }

  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance =
    prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  return {
    productData,
    prices,
    variantsCounts,
    avgPrice: mean,
    medianPrice: median,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    stdDev,
    productsOnSale: productData.filter((p) => p.has_compare_at_price).length,
  };
}

/**
 * Analyze Shopify store
 */
export async function analyzeShopifyStore(storeUrl, maxProducts = null) {
  console.log(`\n=== STARTING SHOPIFY ANALYSIS ===`);
  console.log(`Store URL: ${storeUrl}`);
  console.log(`Max products: ${maxProducts || "all"}`);

  const productsResult = await fetchProducts(storeUrl, maxProducts);

  console.log(`Products fetch result:`, productsResult);

  let products;
  if (
    !productsResult.success &&
    productsResult.partial &&
    productsResult.products
  ) {
    console.warn(`⚠️ Warning: ${productsResult.error}`);
    console.log(
      `Continuing with ${productsResult.products.length} products...`
    );
    products = productsResult.products;
  } else if (!productsResult.success) {
    console.error(`❌ Failed to fetch products: ${productsResult.error}`);
    return { success: false, error: productsResult.error };
  } else {
    products = productsResult.products;
  }

  console.log(`✓ Successfully fetched ${products.length} products`);

  if (productsResult.truncated) {
    console.log(
      `Note: Analysis limited to ${maxProducts} products (total available: ${productsResult.total_available})`
    );
  }

  const collectionsResult = await fetchCollections(storeUrl);
  const collections = collectionsResult.collections || [];
  console.log(`✓ Fetched ${collections.length} collections`);

  const stats = calculateStatistics(products, storeUrl);

  if (!stats) {
    return {
      success: false,
      error:
        "No valid product data found. Store may not be Shopify or has no products.",
    };
  }

  const {
    productData,
    prices,
    variantsCounts,
    avgPrice,
    medianPrice,
    minPrice,
    maxPrice,
    stdDev,
    productsOnSale,
  } = stats;

  const salePercentage = (productsOnSale / productData.length) * 100;

  // Determine pricing strategy
  let strategyType;
  if (avgPrice > 16000) strategyType = "luxury";
  else if (avgPrice > 12000) strategyType = "premium";
  else if (avgPrice < 2400) strategyType = "penetration";
  else strategyType = "value";

  // Price distribution
  const budgetCount = prices.filter((p) => p < 4000).length;
  const midRangeCount = prices.filter((p) => p >= 4000 && p < 12000).length;
  const premiumCount = prices.filter((p) => p >= 12000 && p < 40000).length;
  const luxuryCount = prices.filter((p) => p >= 40000).length;

  const totalVariants = prices.length;
  const priceDistribution = {
    budget_percentage: Math.round((budgetCount / totalVariants) * 1000) / 10,
    mid_range_percentage:
      Math.round((midRangeCount / totalVariants) * 1000) / 10,
    premium_percentage: Math.round((premiumCount / totalVariants) * 1000) / 10,
    luxury_percentage: Math.round((luxuryCount / totalVariants) * 1000) / 10,
  };

  // Product strategy
  const avgVariants =
    variantsCounts.reduce((a, b) => a + b, 0) / variantsCounts.length;
  let variantStrategy;
  if (avgVariants > 10) variantStrategy = "high_customization";
  else if (avgVariants > 5) variantStrategy = "moderate_options";
  else variantStrategy = "simple_selection";

  // Strategic positioning
  const catalogStrategy =
    products.length < 100
      ? "niche_specialist"
      : products.length > 200
      ? "broad_generalist"
      : "balanced";
  const pricingSpread = (maxPrice - minPrice) / avgPrice;
  const pricingConsistency =
    pricingSpread < 2
      ? "highly_consistent"
      : pricingSpread < 5
      ? "moderate_spread"
      : "wide_variety";

  const promoStrategy =
    salePercentage > 20
      ? "aggressive_promotions"
      : salePercentage > 5
      ? "selective_promotions"
      : "premium_no_discount";

  // Build analysis
  const analysis = {
    success: true,
    store_url: storeUrl,
    overview: {
      total_products: products.length,
      total_variants: totalVariants,
      total_collections: collections.length,
      products_on_sale: productsOnSale,
      sale_percentage: Math.round(salePercentage * 10) / 10,
      product_range: `₹${Math.round(minPrice).toLocaleString()} - ₹${Math.round(
        maxPrice
      ).toLocaleString()}`,
      brand_positioning:
        strategyType.charAt(0).toUpperCase() + strategyType.slice(1),
      catalog_strategy: catalogStrategy
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      pricing_consistency: pricingConsistency
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      promotional_strategy: promoStrategy
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
    },
    pricing_strategy: {
      strategy_type: strategyType,
      average_price: Math.round(avgPrice * 100) / 100,
      median_price: Math.round(medianPrice * 100) / 100,
      min_price: Math.round(minPrice * 100) / 100,
      max_price: Math.round(maxPrice * 100) / 100,
      std_deviation: Math.round(stdDev * 100) / 100,
      price_distribution: priceDistribution,
      insights: [
        `Average price point of ₹${Math.round(
          avgPrice
        ).toLocaleString()} positions store as ${strategyType}`,
        `Price range spans ₹${Math.round(
          maxPrice - minPrice
        ).toLocaleString()}, showing ${
          maxPrice / minPrice > 10 ? "wide" : "narrow"
        } catalog diversity`,
        `Standard deviation of ₹${Math.round(
          stdDev
        ).toLocaleString()} indicates ${pricingConsistency.replace(
          /_/g,
          " "
        )} pricing`,
        `${salePercentage.toFixed(
          1
        )}% of products on sale indicates ${promoStrategy.replace(
          /_/g,
          " "
        )} strategy`,
      ],
    },
    product_strategy: {
      variant_strategy: variantStrategy,
      average_variants_per_product: Math.round(avgVariants * 10) / 10,
      total_collections: collections.length,
      insights: [
        `Average of ${avgVariants.toFixed(
          1
        )} variants per product indicates ${variantStrategy.replace(
          /_/g,
          " "
        )}`,
        `${collections.length} collections provide ${
          collections.length > 8 ? "good" : "limited"
        } navigation structure`,
      ],
    },
  };

  return analysis;
}
