###
  # HIMLE RIA Server
  # Copyright (C) 2008 HIMLE GROUP http://himle.sorsacode.com/
  #  
  #  This program is free software; you can redistribute it and/or modify it under the terms
  #  of the GNU General Public License as published by the Free Software Foundation;
  #  either version 2 of the License, or (at your option) any later version. 
  #  This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
  #  without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
  #  See the GNU General Public License for more details. 
  #  You should have received a copy of the GNU General Public License along with this program;
  #  if not, write to the Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
  ###

#    This file is part of ROXOR, see http://roxor.sorsacode.com/

#    ROXOR is free software; you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation; either version 3 of the License, or
#    (at your option) any later version.

#    ROXOR is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.

#    You should have received a copy of the GNU General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.

#    Copyright 2003, 2004, 2005, 2007 Juha-Jarmo Heinonen

### ROXOR MySQL Abstractor
##  by  Juha-Jarmo Heinonen (otus@olen.to)
###


require "dbi"

class Status_TBL
  attr_reader :name, :rows, :size_avg, :size, :last_id, :created, :modified, :comment
  def initialize(row)
    @name     = row['Name']
    @rows     = row['Rows']
    @size_avg = row['Avg_row_length']
    @size     = row['Data_length']
    @last_id  = row['Auto_increment']
    ct = row['Create_time']
    creat = Time.gm(ct.year,ct.month,ct.day,ct.hour,ct.minute,ct.second)
    @created  = creat.to_i
    mt  = row['Update_time']
    modit = Time.gm(mt.year,mt.month,mt.day,mt.hour,mt.minute,mt.second)
    @modified = modit.to_i
    @comment  = row['Comment']
  end
end

class Status_DB
  attr_reader :size, :created, :modified, :name
  def initialize(size,modified,created,name)
    @size       = size
    @modified   = modified
    @created    = created
    @name       = name
  end
end

class MySQLAbstractor
  def initialize(conf,db_name)
    (@host,@user,@pass,@debe) = [conf[:host],conf[:user],conf[:pass],db_name]
    if conf.has_key?(:port)
      @port = conf[:port]
    else
      @port = 3306
    end
    @conn = false
  end
  def open
    begin
      if not @conn and @debe
        @conn = DBI.connect("DBI:Mysql:database=#{@debe}:host=#{@host},port=#{@port}",@user,@pass)
        return true
      end
    rescue DBI::DatabaseError
      $stderr.write("Warn: DBConn.open; unable to connect (@debe:#{@debe.inspect},@host:#{@host.inspect})\n")
      @conn = DBI.connect("DBI:Mysql:database=#{@debe}:host=#{@host},port=#{@port}",@user,@pass)
      db(@debe)
      return true
    end
  end
  def close
    begin
      @conn.disconnect if @conn # Close only when a connection is open
    rescue DBI::DatabaseError
      $stderr.write("Note: DBConn.close; unable to close connection (@debe:#{@debe.inspect},@host:#{@host.inspect})\n")
    end
    @conn = false
  end
  def dbs
    open unless @conn
    if @conn
      databases = []
      q("show databases").each do |database|
        databases.push(database['Database'])
      end
      return databases.sort
    else
      return false
    end
  end
  def tables
    open if not @conn
    table_names = []
    q("show tables").each do |table_name_hsh|
      table_names.push(table_name_hsh[table_name_hsh.keys[0]])
    end
    return table_names.sort
  end
  def db(db_name=false)
    open unless @conn
    if db_name
      unless dbs.include?(db_name)
        $stderr.write("Note: creating database #{db_name.inspect}\n")
        #@conn.func(:createdb,db_name)
        @conn.execute("create database #{db_name}")
      end
      close
      @debe = db_name
      open
      return true
    else
      return false
    end
  end
  def status
    open if not @conn
    quo = @conn.execute("show table status")
    status_tbl = {}
    total_bytes = 0
    modified_db = 0
    created_db = 2**32
    quo.fetch_hash do |row|
      table_info = Status_TBL.new(row)
      status_tbl[table_info.name] = table_info
      modified_db = table_info.modified if modified_db < table_info.modified
      created_db  = table_info.created  if created_db > table_info.created
      total_bytes += table_info.size
    end
    status_db = Status_DB.new(total_bytes,modified_db,created_db,@debe)
    return [status_db,status_tbl]
  end
  def trans(qu_a)
    @conn['AutoCommit'] = false
    begin
      qu_a.each do |qu|
        @conn.do( qu )
      end
      @conn.commit
    rescue
      puts "query failure: #{qu_a.inspect}"
      @conn.rollback
    end
    @conn['AutoCommit'] = true
  end
  def q(qu)
    action = qu.split(' ')[0].downcase
    inserters = ['insert']
    updaters  = ['update','delete','replace','create','grant','drop','flush']
    get_id = inserters.include?(action)
    get_count = updaters.include?(action)
    open() if not @conn
    if get_id
      begin
        @conn.do(qu)
      rescue
        close
        open
        @conn.do(qu)
      end
      return @conn.func(:insert_id)
    elsif get_count
      begin
        return @conn.do(qu) # matched row count
      rescue
        close
        open
        return @conn.do(qu)
      end
    elsif @debe
      begin
        rows = []
        begin
          quo = @conn.execute(qu)
        rescue
          $stderr.write("Warning: DBConn.q; query error, trying to reopen connection (qu.inspect)\n")
          close
          open
          quo = @conn.execute(qu)
        end
        quo.fetch_hash() do |row|
          rows.push( row ) if row != nil
        end
        return rows
      end
    else
      $stderr.write("ERROR: DBConn.q; unknown query type (qu.inspect)\n")
      return false
    end
  end
end
