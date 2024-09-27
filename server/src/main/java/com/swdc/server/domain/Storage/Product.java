/**
 *
 *  _product_coll에 포함되는 products(List)의 구성요소
 *
 */

package com.swdc.server.domain.Storage;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class Product {
    private String product_id;

    private List<Map<String, Integer>> prices;
}
