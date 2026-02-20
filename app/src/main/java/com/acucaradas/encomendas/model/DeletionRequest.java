package com.acucaradas.encomendas.model;

import com.google.gson.annotations.SerializedName;

import java.util.List;

/**
 * Modelo para solicitações de exclusão de conta ou dados parciais
 */
public class DeletionRequest {

    @SerializedName("user_id")
    private String userId;

    @SerializedName("deletion_type")
    private String deletionType; // "complete" ou "partial"

    @SerializedName("request_date")
    private long requestDate;

    @SerializedName("data_types")
    private List<String> dataTypes; // Usado apenas para exclusão parcial

    @SerializedName("reason")
    private String reason; // Opcional

    // Getters e Setters
    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getDeletionType() {
        return deletionType;
    }

    public void setDeletionType(String deletionType) {
        this.deletionType = deletionType;
    }

    public long getRequestDate() {
        return requestDate;
    }

    public void setRequestDate(long requestDate) {
        this.requestDate = requestDate;
    }

    public List<String> getDataTypes() {
        return dataTypes;
    }

    public void setDataTypes(List<String> dataTypes) {
        this.dataTypes = dataTypes;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}