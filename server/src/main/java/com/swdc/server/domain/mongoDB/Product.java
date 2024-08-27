/**
 *
 *  _product_coll에 포함되는 products(List)의 구성요소
 *
 */

package com.swdc.server.domain.mongoDB;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class Product {
    @Field("products.product_id")
    private String product_id;

    @Field("products.prices")
    private List<Map<String, Integer>> prices;
}
