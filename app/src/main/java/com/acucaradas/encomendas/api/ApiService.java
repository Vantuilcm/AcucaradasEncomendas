package com.acucaradas.encomendas.api;

import com.acucaradas.encomendas.model.DeletionRequest;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

/**
 * Interface para definir os endpoints da API
 */
public interface ApiService {

    /**
     * Endpoint para solicitar exclusão completa da conta
     * @param request Objeto com informações da solicitação
     * @return Resposta vazia (204 No Content) em caso de sucesso
     */
    @POST("account/delete")
    Call<Void> requestAccountDeletion(@Body DeletionRequest request);

    /**
     * Endpoint para solicitar exclusão parcial de dados
     * @param request Objeto com informações da solicitação e tipos de dados a serem excluídos
     * @return Resposta vazia (204 No Content) em caso de sucesso
     */
    @POST("account/delete-partial")
    Call<Void> requestPartialDeletion(@Body DeletionRequest request);
}