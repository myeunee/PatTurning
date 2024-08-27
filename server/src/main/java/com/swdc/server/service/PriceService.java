package com.swdc.server.service;

import com.swdc.server.domain.mongoDB.Product;
import com.swdc.server.domain.mongoDB.collection.CategoryCollection;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.MatchOperation;
import org.springframework.data.mongodb.core.aggregation.UnwindOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;


@RequiredArgsConstructor
@Service
public class PriceService {

    private static final Logger logger = LoggerFactory.getLogger(PriceService.class);

    @Autowired
    private MongoTemplate mongoTemplate;

    public List<CategoryCollection> getCategories(String platform) {
        String collectionName = platform + "_category_collection";
        List<CategoryCollection> results = mongoTemplate.findAll(CategoryCollection.class, collectionName);

        if (results == null) {
            logger.error("Results not found");
            return null; // 카테고리를 찾을 수 없는 경우 적절한 처리를 합니다.
        }

        return results;
    }

    public List<Map<String, Integer>> getProductDetails(String platform, String category_name, String product_id) {

        String productCollectionName = platform + "_product_coll";
        String categoryCollectionName = platform + "_category_coll";

        logger.info("Searching for category: " + category_name + " in collection: " + categoryCollectionName);


        Query categoryQuery = new Query();
        categoryQuery.addCriteria(Criteria.where("category_name").is(category_name));
        categoryQuery.fields().include("_id").exclude("category_name");

        CategoryCollection category = mongoTemplate.findOne(categoryQuery, CategoryCollection.class, categoryCollectionName);

        if (category == null) {
            logger.error("Category not found for category_name: " + category_name);
            throw new RuntimeException("Category not found for category_name: " + category_name);
        }

        Integer category_id = category.getId();

        MatchOperation matchCategoryId = Aggregation.match(Criteria.where("category_id").is(category_id));
        UnwindOperation unwindProducts = Aggregation.unwind("products");
        MatchOperation matchProductId = Aggregation.match(Criteria.where("products.product_id").is(product_id));

        Aggregation aggregation = Aggregation.newAggregation(matchCategoryId, unwindProducts, matchProductId);

        AggregationResults<Product> results = mongoTemplate.aggregate(aggregation, productCollectionName, Product.class);

        Product product = results.getUniqueMappedResult();

        if (product == null) {
            logger.error("Product not found for product_id: " + product_id);
            throw new RuntimeException("Product not found for product_id: " + product_id);
        }

        return product.getPrices();
    }

}
