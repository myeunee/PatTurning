package com.swdc.server.controller;

import com.swdc.server.domain.mongoDB.Product;
import com.swdc.server.domain.mongoDB.collection.CategoryCollection;
import com.swdc.server.service.PriceService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/price-info")
public class PriceController {

    private final PriceService priceService;

    @GetMapping("{platform}/{product_id}/**")
    public Product getPriceInfo(@PathVariable String platform, HttpServletRequest request, @PathVariable String product_id) {
        String restOfPath = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String bestMatchPattern = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String category_name = new AntPathMatcher().extractPathWithinPattern(bestMatchPattern, restOfPath);

        category_name = UriUtils.decode(category_name, StandardCharsets.UTF_8);

        return priceService.getProductDetails(platform, category_name, product_id);
    }
}
