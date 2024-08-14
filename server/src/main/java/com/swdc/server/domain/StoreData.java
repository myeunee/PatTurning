package com.swdc.server.domain;


import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Document(collection = "product_price_collections")
public class StoreData {

    @Id
    private String _id;

    private String platform;
    private List<Category> categories;

}
