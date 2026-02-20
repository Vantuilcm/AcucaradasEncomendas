package com.acucaradas.encomendas.database;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.util.ArrayList;
import java.util.List;

public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "acucaradas.db";
    private static final int DATABASE_VERSION = 1;

    // Tabela de Usuários
    public static final String TABLE_USERS = "users";
    public static final String COLUMN_USER_ID = "id";
    public static final String COLUMN_USER_NAME = "name";
    public static final String COLUMN_USER_EMAIL = "email";
    public static final String COLUMN_USER_PASSWORD = "password";
    public static final String COLUMN_USER_PHONE = "phone";
    public static final String COLUMN_USER_CREATED_AT = "created_at";

    // Tabela de Endereços
    public static final String TABLE_ADDRESSES = "addresses";
    public static final String COLUMN_ADDRESS_ID = "id";
    public static final String COLUMN_ADDRESS_USER_ID = "user_id";
    public static final String COLUMN_ADDRESS_STREET = "street";
    public static final String COLUMN_ADDRESS_NUMBER = "number";
    public static final String COLUMN_ADDRESS_COMPLEMENT = "complement";
    public static final String COLUMN_ADDRESS_NEIGHBORHOOD = "neighborhood";
    public static final String COLUMN_ADDRESS_CITY = "city";
    public static final String COLUMN_ADDRESS_STATE = "state";
    public static final String COLUMN_ADDRESS_ZIPCODE = "zipcode";
    public static final String COLUMN_ADDRESS_IS_DEFAULT = "is_default";

    // Tabela de Pedidos
    public static final String TABLE_ORDERS = "orders";
    public static final String COLUMN_ORDER_ID = "id";
    public static final String COLUMN_ORDER_USER_ID = "user_id";
    public static final String COLUMN_ORDER_ADDRESS_ID = "address_id";
    public static final String COLUMN_ORDER_TOTAL = "total";
    public static final String COLUMN_ORDER_STATUS = "status";
    public static final String COLUMN_ORDER_CREATED_AT = "created_at";
    public static final String COLUMN_ORDER_PAYMENT_METHOD = "payment_method";

    // Tabela de Itens do Pedido
    public static final String TABLE_ORDER_ITEMS = "order_items";
    public static final String COLUMN_ORDER_ITEM_ID = "id";
    public static final String COLUMN_ORDER_ITEM_ORDER_ID = "order_id";
    public static final String COLUMN_ORDER_ITEM_PRODUCT_ID = "product_id";
    public static final String COLUMN_ORDER_ITEM_QUANTITY = "quantity";
    public static final String COLUMN_ORDER_ITEM_PRICE = "price";

    // Tabela de Preferências do Usuário
    public static final String TABLE_USER_PREFERENCES = "user_preferences";
    public static final String COLUMN_PREFERENCE_USER_ID = "user_id";
    public static final String COLUMN_PREFERENCE_NOTIFICATIONS = "notifications_enabled";
    public static final String COLUMN_PREFERENCE_THEME = "theme";
    public static final String COLUMN_PREFERENCE_LANGUAGE = "language";

    // Tabela de Métodos de Pagamento
    public static final String TABLE_PAYMENT_METHODS = "payment_methods";
    public static final String COLUMN_PAYMENT_ID = "id";
    public static final String COLUMN_PAYMENT_USER_ID = "user_id";
    public static final String COLUMN_PAYMENT_TYPE = "type";
    public static final String COLUMN_PAYMENT_CARD_NUMBER = "card_number";
    public static final String COLUMN_PAYMENT_CARD_HOLDER = "card_holder";
    public static final String COLUMN_PAYMENT_EXPIRY_DATE = "expiry_date";
    public static final String COLUMN_PAYMENT_IS_DEFAULT = "is_default";

    // Tabela de Solicitações de Exclusão
    public static final String TABLE_DELETION_REQUESTS = "deletion_requests";
    public static final String COLUMN_DELETION_ID = "id";
    public static final String COLUMN_DELETION_USER_ID = "user_id";
    public static final String COLUMN_DELETION_TYPE = "type";
    public static final String COLUMN_DELETION_DATA_TYPES = "data_types";
    public static final String COLUMN_DELETION_REASON = "reason";
    public static final String COLUMN_DELETION_STATUS = "status";
    public static final String COLUMN_DELETION_REQUESTED_AT = "requested_at";
    public static final String COLUMN_DELETION_PROCESSED_AT = "processed_at";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        // Criar tabela de usuários
        String CREATE_USERS_TABLE = "CREATE TABLE " + TABLE_USERS + "("
                + COLUMN_USER_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, "
                + COLUMN_USER_NAME + " TEXT, "
                + COLUMN_USER_EMAIL + " TEXT UNIQUE, "
                + COLUMN_USER_PASSWORD + " TEXT, "
                + COLUMN_USER_PHONE + " TEXT, "
                + COLUMN_USER_CREATED_AT + " DATETIME DEFAULT CURRENT_TIMESTAMP"
                + ")";
        db.execSQL(CREATE_USERS_TABLE);

        // Criar tabela de endereços
        String CREATE_ADDRESSES_TABLE = "CREATE TABLE " + TABLE_ADDRESSES + "("
                + COLUMN_ADDRESS_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, "
                + COLUMN_ADDRESS_USER_ID + " INTEGER, "
                + COLUMN_ADDRESS_STREET + " TEXT, "
                + COLUMN_ADDRESS_NUMBER + " TEXT, "
                + COLUMN_ADDRESS_COMPLEMENT + " TEXT, "
                + COLUMN_ADDRESS_NEIGHBORHOOD + " TEXT, "
                + COLUMN_ADDRESS_CITY + " TEXT, "
                + COLUMN_ADDRESS_STATE + " TEXT, "
                + COLUMN_ADDRESS_ZIPCODE + " TEXT, "
                + COLUMN_ADDRESS_IS_DEFAULT + " INTEGER DEFAULT 0, "
                + "FOREIGN KEY(" + COLUMN_ADDRESS_USER_ID + ") REFERENCES " + TABLE_USERS + "(" + COLUMN_USER_ID + ")"
                + ")";
        db.execSQL(CREATE_ADDRESSES_TABLE);

        // Criar tabela de pedidos
        String CREATE_ORDERS_TABLE = "CREATE TABLE " + TABLE_ORDERS + "("
                + COLUMN_ORDER_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, "
                + COLUMN_ORDER_USER_ID + " INTEGER, "
                + COLUMN_ORDER_ADDRESS_ID + " INTEGER, "
                + COLUMN_ORDER_TOTAL + " REAL, "
                + COLUMN_ORDER_STATUS + " TEXT, "
                + COLUMN_ORDER_PAYMENT_METHOD + " TEXT, "
                + COLUMN_ORDER_CREATED_AT + " DATETIME DEFAULT CURRENT_TIMESTAMP, "
                + "FOREIGN KEY(" + COLUMN_ORDER_USER_ID + ") REFERENCES " + TABLE_USERS + "(" + COLUMN_USER_ID + "), "
                + "FOREIGN KEY(" + COLUMN_ORDER_ADDRESS_ID + ") REFERENCES " + TABLE_ADDRESSES + "(" + COLUMN_ADDRESS_ID + ")"
                + ")";
        db.execSQL(CREATE_ORDERS_TABLE);

        // Criar tabela de itens do pedido
        String CREATE_ORDER_ITEMS_TABLE = "CREATE TABLE " + TABLE_ORDER_ITEMS + "("
                + COLUMN_ORDER_ITEM_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, "
                + COLUMN_ORDER_ITEM_ORDER_ID + " INTEGER, "
                + COLUMN_ORDER_ITEM_PRODUCT_ID + " INTEGER, "
                + COLUMN_ORDER_ITEM_QUANTITY + " INTEGER, "
                + COLUMN_ORDER_ITEM_PRICE + " REAL, "
                + "FOREIGN KEY(" + COLUMN_ORDER_ITEM_ORDER_ID + ") REFERENCES " + TABLE_ORDERS + "(" + COLUMN_ORDER_ID + ")"
                + ")";
        db.execSQL(CREATE_ORDER_ITEMS_TABLE);

        // Criar tabela de preferências do usuário
        String CREATE_USER_PREFERENCES_TABLE = "CREATE TABLE " + TABLE_USER_PREFERENCES + "("
                + COLUMN_PREFERENCE_USER_ID + " INTEGER PRIMARY KEY, "
                + COLUMN_PREFERENCE_NOTIFICATIONS + " INTEGER DEFAULT 1, "
                + COLUMN_PREFERENCE_THEME + " TEXT DEFAULT 'light', "
                + COLUMN_PREFERENCE_LANGUAGE + " TEXT DEFAULT 'pt_BR', "
                + "FOREIGN KEY(" + COLUMN_PREFERENCE_USER_ID + ") REFERENCES " + TABLE_USERS + "(" + COLUMN_USER_ID + ")"
                + ")";
        db.execSQL(CREATE_USER_PREFERENCES_TABLE);

        // Criar tabela de métodos de pagamento
        String CREATE_PAYMENT_METHODS_TABLE = "CREATE TABLE " + TABLE_PAYMENT_METHODS + "("
                + COLUMN_PAYMENT_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, "
                + COLUMN_PAYMENT_USER_ID + " INTEGER, "
                + COLUMN_PAYMENT_TYPE + " TEXT, "
                + COLUMN_PAYMENT_CARD_NUMBER + " TEXT, "
                + COLUMN_PAYMENT_CARD_HOLDER + " TEXT, "
                + COLUMN_PAYMENT_EXPIRY_DATE + " TEXT, "
                + COLUMN_PAYMENT_IS_DEFAULT + " INTEGER DEFAULT 0, "
                + "FOREIGN KEY(" + COLUMN_PAYMENT_USER_ID + ") REFERENCES " + TABLE_USERS + "(" + COLUMN_USER_ID + ")"
                + ")";
        db.execSQL(CREATE_PAYMENT_METHODS_TABLE);

        // Criar tabela de solicitações de exclusão
        String CREATE_DELETION_REQUESTS_TABLE = "CREATE TABLE " + TABLE_DELETION_REQUESTS + "("
                + COLUMN_DELETION_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, "
                + COLUMN_DELETION_USER_ID + " INTEGER, "
                + COLUMN_DELETION_TYPE + " TEXT, "
                + COLUMN_DELETION_DATA_TYPES + " TEXT, "
                + COLUMN_DELETION_REASON + " TEXT, "
                + COLUMN_DELETION_STATUS + " TEXT DEFAULT 'pending', "
                + COLUMN_DELETION_REQUESTED_AT + " DATETIME DEFAULT CURRENT_TIMESTAMP, "
                + COLUMN_DELETION_PROCESSED_AT + " DATETIME, "
                + "FOREIGN KEY(" + COLUMN_DELETION_USER_ID + ") REFERENCES " + TABLE_USERS + "(" + COLUMN_USER_ID + ")"
                + ")";
        db.execSQL(CREATE_DELETION_REQUESTS_TABLE);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // Em caso de atualização do banco de dados, podemos adicionar lógica aqui
        if (oldVersion < 2) {
            // Atualizações para a versão 2
        }
    }

    /**
     * Métodos para exclusão de conta e dados
     */
    
    // Registra uma solicitação de exclusão completa de conta
    public long requestCompleteAccountDeletion(long userId, String reason) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        
        values.put(COLUMN_DELETION_USER_ID, userId);
        values.put(COLUMN_DELETION_TYPE, "complete");
        values.put(COLUMN_DELETION_REASON, reason);
        
        long id = db.insert(TABLE_DELETION_REQUESTS, null, values);
        db.close();
        return id;
    }
    
    // Registra uma solicitação de exclusão parcial de dados
    public long requestPartialDataDeletion(long userId, String dataTypes, String reason) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        
        values.put(COLUMN_DELETION_USER_ID, userId);
        values.put(COLUMN_DELETION_TYPE, "partial");
        values.put(COLUMN_DELETION_DATA_TYPES, dataTypes);
        values.put(COLUMN_DELETION_REASON, reason);
        
        long id = db.insert(TABLE_DELETION_REQUESTS, null, values);
        db.close();
        return id;
    }
    
    // Executa a exclusão completa da conta
    public boolean executeCompleteAccountDeletion(long userId) {
        SQLiteDatabase db = this.getWritableDatabase();
        boolean success = false;
        
        try {
            db.beginTransaction();
            
            // Excluir preferências do usuário
            db.delete(TABLE_USER_PREFERENCES, COLUMN_PREFERENCE_USER_ID + " = ?", new String[]{String.valueOf(userId)});
            
            // Excluir métodos de pagamento
            db.delete(TABLE_PAYMENT_METHODS, COLUMN_PAYMENT_USER_ID + " = ?", new String[]{String.valueOf(userId)});
            
            // Excluir itens de pedidos associados aos pedidos do usuário
            Cursor orderCursor = db.query(TABLE_ORDERS, new String[]{COLUMN_ORDER_ID}, 
                    COLUMN_ORDER_USER_ID + " = ?", new String[]{String.valueOf(userId)}, null, null, null);
            
            if (orderCursor.moveToFirst()) {
                do {
                    int orderId = orderCursor.getInt(orderCursor.getColumnIndex(COLUMN_ORDER_ID));
                    db.delete(TABLE_ORDER_ITEMS, COLUMN_ORDER_ITEM_ORDER_ID + " = ?", new String[]{String.valueOf(orderId)});
                } while (orderCursor.moveToNext());
            }
            orderCursor.close();
            
            // Excluir pedidos
            db.delete(TABLE_ORDERS, COLUMN_ORDER_USER_ID + " = ?", new String[]{String.valueOf(userId)});
            
            // Excluir endereços
            db.delete(TABLE_ADDRESSES, COLUMN_ADDRESS_USER_ID + " = ?", new String[]{String.valueOf(userId)});
            
            // Atualizar status da solicitação de exclusão
            ContentValues values = new ContentValues();
            values.put(COLUMN_DELETION_STATUS, "completed");
            values.put(COLUMN_DELETION_PROCESSED_AT, System.currentTimeMillis());
            db.update(TABLE_DELETION_REQUESTS, values, 
                    COLUMN_DELETION_USER_ID + " = ? AND " + COLUMN_DELETION_TYPE + " = ? AND " + COLUMN_DELETION_STATUS + " = ?", 
                    new String[]{String.valueOf(userId), "complete", "pending"});
            
            // Finalmente, excluir o usuário
            db.delete(TABLE_USERS, COLUMN_USER_ID + " = ?", new String[]{String.valueOf(userId)});
            
            db.setTransactionSuccessful();
            success = true;
        } catch (Exception e) {
            // Log do erro
            e.printStackTrace();
            success = false;
        } finally {
            db.endTransaction();
            db.close();
        }
        
        return success;
    }
    
    // Executa a exclusão parcial de dados
    public boolean executePartialDataDeletion(long userId, List<String> dataTypes) {
        SQLiteDatabase db = this.getWritableDatabase();
        boolean success = false;
        
        try {
            db.beginTransaction();
            
            for (String dataType : dataTypes) {
                switch (dataType) {
                    case "orders":
                        // Excluir itens de pedidos associados aos pedidos do usuário
                        Cursor orderCursor = db.query(TABLE_ORDERS, new String[]{COLUMN_ORDER_ID}, 
                                COLUMN_ORDER_USER_ID + " = ?", new String[]{String.valueOf(userId)}, null, null, null);
                        
                        if (orderCursor.moveToFirst()) {
                            do {
                                int orderId = orderCursor.getInt(orderCursor.getColumnIndex(COLUMN_ORDER_ID));
                                db.delete(TABLE_ORDER_ITEMS, COLUMN_ORDER_ITEM_ORDER_ID + " = ?", new String[]{String.valueOf(orderId)});
                            } while (orderCursor.moveToNext());
                        }
                        orderCursor.close();
                        
                        // Excluir pedidos
                        db.delete(TABLE_ORDERS, COLUMN_ORDER_USER_ID + " = ?", new String[]{String.valueOf(userId)});
                        break;
                        
                    case "addresses":
                        // Excluir endereços
                        db.delete(TABLE_ADDRESSES, COLUMN_ADDRESS_USER_ID + " = ?", new String[]{String.valueOf(userId)});
                        break;
                        
                    case "payment":
                        // Excluir métodos de pagamento
                        db.delete(TABLE_PAYMENT_METHODS, COLUMN_PAYMENT_USER_ID + " = ?", new String[]{String.valueOf(userId)});
                        break;
                        
                    case "preferences":
                        // Resetar preferências do usuário para valores padrão
                        ContentValues prefValues = new ContentValues();
                        prefValues.put(COLUMN_PREFERENCE_NOTIFICATIONS, 1);
                        prefValues.put(COLUMN_PREFERENCE_THEME, "light");
                        prefValues.put(COLUMN_PREFERENCE_LANGUAGE, "pt_BR");
                        db.update(TABLE_USER_PREFERENCES, prefValues, COLUMN_PREFERENCE_USER_ID + " = ?", new String[]{String.valueOf(userId)});
                        break;
                }
            }
            
            // Atualizar status da solicitação de exclusão
            ContentValues values = new ContentValues();
            values.put(COLUMN_DELETION_STATUS, "completed");
            values.put(COLUMN_DELETION_PROCESSED_AT, System.currentTimeMillis());
            db.update(TABLE_DELETION_REQUESTS, values, 
                    COLUMN_DELETION_USER_ID + " = ? AND " + COLUMN_DELETION_TYPE + " = ? AND " + COLUMN_DELETION_STATUS + " = ?", 
                    new String[]{String.valueOf(userId), "partial", "pending"});
            
            db.setTransactionSuccessful();
            success = true;
        } catch (Exception e) {
            // Log do erro
            e.printStackTrace();
            success = false;
        } finally {
            db.endTransaction();
            db.close();
        }
        
        return success;
    }
    
    // Verifica se existe uma solicitação de exclusão pendente para o usuário
    public boolean hasPendingDeletionRequest(long userId) {
        SQLiteDatabase db = this.getReadableDatabase();
        
        Cursor cursor = db.query(TABLE_DELETION_REQUESTS, new String[]{COLUMN_DELETION_ID}, 
                COLUMN_DELETION_USER_ID + " = ? AND " + COLUMN_DELETION_STATUS + " = ?", 
                new String[]{String.valueOf(userId), "pending"}, null, null, null);
        
        boolean hasPending = cursor.getCount() > 0;
        cursor.close();
        db.close();
        
        return hasPending;
    }
}