package com.swdc.server.repository;

import com.swdc.server.domain.StoreData;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoreDataRepository extends MongoRepository<StoreData, String> {
    Optional<StoreData> findByPlatform(String platform);
}
