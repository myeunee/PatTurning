package com.swdc.server.controller;

import com.swdc.server.domain.mongoDB.Price;
import com.swdc.server.service.PriceService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;

@RequiredArgsConstructor
@RestController
@RequestMapping("/price-info")
public class PriceController {

    private final PriceService priceService;

    @GetMapping("{platform}/{product_id}/**")
    public Price getPriceInfo(@PathVariable String platform, HttpServletRequest request, @PathVariable String product_id) {
        String restOfPath = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String bestMatchPattern = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String category_name = new AntPathMatcher().extractPathWithinPattern(bestMatchPattern, restOfPath);

        category_name = UriUtils.decode(category_name, StandardCharsets.UTF_8);

        return priceService.getProductDetails(platform, category_name, product_id);
    }
}
