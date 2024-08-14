package com.swdc.server.service;

import com.swdc.server.domain.Category;
import com.swdc.server.domain.Price;
import com.swdc.server.domain.StoreData;
import com.swdc.server.domain.Product;
import com.swdc.server.repository.StoreDataRepository;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class PriceService {
    private final StoreDataRepository storeDataRepository;

    public Map<String, Integer> getPrices(String platform, String category_name, String product_id) {
        // platform에 해당하는 StoreData 가져오기
        Optional<StoreData> storeDataOptional = storeDataRepository.findByPlatform(platform);

        if (storeDataOptional.isPresent()) {
            StoreData storeData = storeDataOptional.get();

            // categoryName에 해당하는 Category 찾기
            Optional<Category> categoryOptional = storeData.getCategories().stream()
                    .filter(category -> category.getCategory_name().equals(category_name))
                    .findFirst();

            if (categoryOptional.isPresent()) {
                Category category = categoryOptional.get();

                // productId에 해당하는 Product 찾기
                Optional<Product> productOptional = category.getProducts().stream()
                        .filter(product -> product.getProduct_id().equals(product_id))
                        .findFirst();

                if (productOptional.isPresent()) {
                    // prices 반환
                    return productOptional.get().getPrices();
                }
            }
        }
        // 해당하는 데이터가 없으면 null 반환
        return null;
    }
}
